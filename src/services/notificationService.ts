import {
  CanonicalEvent,
  JourneyStage,
  UnifiedSessionState,
  SportsEvent,
  LiveMatchRoom,
} from '../types/canonical';

export const NOTIFICATIONS_STORAGE_KEY = 'waypoint_notifications';

export interface InAppNotification {
  id: string;
  text: string;
  timestamp: number;
  read: boolean;
  journeyStage: JourneyStage;
  category: 'live_update' | 'continuity' | 'room' | 'recovery' | 'content';
  fixtureId?: string;
  fixtureName?: string;
  roomId?: string;
  roomName?: string;
}

// In-memory fallback for non-browser / unit test environments
let memoryNotifications: string | null = null;

export function _resetNotificationFallbackForTesting(): void {
  memoryNotifications = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    }
  } catch {}
}

/* =========================================================================
   1. RESPONSIBLE INTELLIGENCE SAFETY GATE
   ========================================================================= */

/**
 * Prohibited patterns:
 * - "bet now", "bet again", "you haven't bet today", "don't miss out"
 * - "increase your stake", "recover your losses", "place another bet", "keep betting"
 * - urgency/countdown pressure: "hurry", "limited time", "act fast", "before it expires"
 * - financial / loss-chasing terminology
 */
export const PROHIBITED_PHRASES = [
  'bet now',
  'bet again',
  "haven't bet",
  'dont miss out',
  "don't miss out",
  'increase your stake',
  'increase stake',
  'recover your losses',
  'recover loss',
  'place another bet',
  'keep betting',
  'hurry',
  'limited time',
  'act fast',
  'before it expires',
  'wager now',
  'double your',
  'chase your',
  'guaranteed win',
];

export interface SafetyCheckResult {
  passed: boolean;
  reasons: string[];
}

/**
 * Validates candidate notification text against the deterministic Responsible Intelligence gate.
 * Rejects any gambling urgency, turnover pressure, loss-chasing, or sensitive profiling.
 */
export function evaluateNotificationSafety(text: string): SafetyCheckResult {
  const normalized = text.toLowerCase().trim();
  const reasons: string[] = [];

  for (const phrase of PROHIBITED_PHRASES) {
    if (normalized.includes(phrase)) {
      reasons.push(`Contains prohibited phrase: "${phrase}"`);
    }
  }

  return {
    passed: reasons.length === 0,
    reasons,
  };
}

/* =========================================================================
   2. CONTEXTUAL NOTIFICATION DECISION ENGINE
   ========================================================================= */

export interface NotificationEvaluationContext {
  state: UnifiedSessionState;
  eventsLog: CanonicalEvent[];
  events: SportsEvent[];
  rooms: LiveMatchRoom[];
}

/**
 * Contextual Notification Generator:
 * Evaluates interest signals (sports/fixtures viewed, markets explored, rooms joined, recovery state)
 * combined with the user's current journey stage, then passes candidate messages through the safety gate.
 */
export function evaluateContextualNotification(
  context: NotificationEvaluationContext
): Omit<InAppNotification, 'id' | 'timestamp' | 'read'> | null {
  const { state, eventsLog, events, rooms } = context;

  // 1. RECOVERY CONTEXT: If session just recovered safely
  if (state.healthState === 'RECOVERED' || state.recoveryState.recoveredReceipt) {
    const candidate = {
      text: 'Your session has recovered. Context restored safely.',
      journeyStage: state.journeyStage,
      category: 'recovery' as const,
    };
    if (evaluateNotificationSafety(candidate.text).passed) return candidate;
  }

  // 2. LIVE ROOM CONTEXT: If active room exists or user joined a room
  if (state.socialRoomContext.activeRoomId) {
    const activeRoom = rooms.find(r => r.roomId === state.socialRoomContext.activeRoomId);
    if (activeRoom) {
      const candidate = {
        text: `Your Live Room "${activeRoom.roomName}" is active with ${activeRoom.participantCount} participant${activeRoom.participantCount > 1 ? 's' : ''}.`,
        journeyStage: state.journeyStage,
        category: 'room' as const,
        roomId: activeRoom.roomId,
        roomName: activeRoom.roomName,
        fixtureId: activeRoom.eventId,
      };
      if (evaluateNotificationSafety(candidate.text).passed) return candidate;
    }
  }

  // 3. CONTINUITY CONTEXT: If exploring an event during EXPLORATION or DECISION
  if (state.currentEvent && (state.journeyStage === 'EXPLORATION' || state.journeyStage === 'DECISION')) {
    const fixture = events.find(e => e.id === state.currentEvent?.id);
    if (fixture) {
      if (fixture.isLive) {
        const candidate = {
          text: `${fixture.homeTeam} vs ${fixture.awayTeam} is now live (${fixture.clock || 'In-Play'}).`,
          journeyStage: state.journeyStage,
          category: 'live_update' as const,
          fixtureId: fixture.id,
          fixtureName: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
        };
        if (evaluateNotificationSafety(candidate.text).passed) return candidate;
      } else {
        const candidate = {
          text: `You were viewing ${fixture.homeTeam} vs ${fixture.awayTeam}. Continue where you left off.`,
          journeyStage: state.journeyStage,
          category: 'continuity' as const,
          fixtureId: fixture.id,
          fixtureName: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
        };
        if (evaluateNotificationSafety(candidate.text).passed) return candidate;
      }
    }
  }

  // 4. DISCOVERY / CONTENT CONTEXT: Sports interest signal
  if (state.currentSport) {
    const sportName = state.currentSport.name || 'Football';
    const candidate = {
      text: `More matches from the ${sportName.toLowerCase()} events you've been exploring are available.`,
      journeyStage: state.journeyStage,
      category: 'content' as const,
    };
    if (evaluateNotificationSafety(candidate.text).passed) return candidate;
  }

  return null;
}

/* =========================================================================
   3. STORAGE & CRUD OPERATIONS (waypoint_notifications, max 10)
   ========================================================================= */

export function loadInAppNotifications(): InAppNotification[] {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    } else {
      raw = memoryNotifications;
    }

    if (!raw) return [];
    const parsed: InAppNotification[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 10);
  } catch {
    return [];
  }
}

export function saveInAppNotifications(notifications: InAppNotification[]): void {
  try {
    const capped = notifications.slice(0, 10);
    const serialized = JSON.stringify(capped);
    memoryNotifications = serialized;
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, serialized);
    }
  } catch {}
}

export function addInAppNotification(
  candidate: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>,
  knownEvents: SportsEvent[] = []
): InAppNotification | null {
  // Validate Safety Gate
  const safety = evaluateNotificationSafety(candidate.text);
  if (!safety.passed) {
    return null;
  }

  // Validate fixture if attached
  if (candidate.fixtureId && knownEvents.length > 0) {
    const exists = knownEvents.some(e => e.id === candidate.fixtureId);
    if (!exists) {
      // Discard notification for nonexistent or obsolete fixture
      return null;
    }
  }

  const existing = loadInAppNotifications();

  // Deduplication: Avoid identical notification if created in the last 2 minutes
  const recentDuplicate = existing.find(
    n => n.text === candidate.text && Date.now() - n.timestamp < 120000
  );
  if (recentDuplicate) {
    return null;
  }

  const newNotification: InAppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...candidate,
    timestamp: Date.now(),
    read: false,
  };

  const updated = [newNotification, ...existing].slice(0, 10);
  saveInAppNotifications(updated);
  return newNotification;
}

export function markNotificationAsRead(id: string): InAppNotification[] {
  const existing = loadInAppNotifications();
  const updated = existing.map(n => (n.id === id ? { ...n, read: true } : n));
  saveInAppNotifications(updated);
  return updated;
}

export function markAllNotificationsAsRead(): InAppNotification[] {
  const existing = loadInAppNotifications();
  const updated = existing.map(n => ({ ...n, read: true }));
  saveInAppNotifications(updated);
  return updated;
}

export function clearInAppNotifications(): void {
  memoryNotifications = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    }
  } catch {}
}

