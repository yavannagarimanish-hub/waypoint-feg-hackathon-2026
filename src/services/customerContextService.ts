import {
  CanonicalEvent,
  CanonicalEventType,
  LiveMatchRoom,
  SportsEvent,
} from '../types/canonical';

export const RECENTLY_VIEWED_KEY = 'waypoint_recently_viewed';
export const SESSION_ACTIVITY_KEY = 'waypoint_session_activity';
export const USER_ROOMS_KEY = 'waypoint_user_rooms';

export interface RecentlyViewedItem {
  eventId: string;
  eventName: string;
  sportId: string;
  sportName: string;
  tournament: string;
  isLive: boolean;
  score?: { home: number; away: number };
  timestamp: number;
}

export interface UserRoomAssociation {
  roomId: string;
  roomCode: string;
  roomName: string;
  eventId: string;
  sportId: string;
  role: 'host' | 'participant';
  joinedAt: number;
}

export interface SessionActivityItem {
  id: string;
  eventType: CanonicalEventType;
  description: string;
  timestamp: number;
  badge?: string;
  iconType: 'view' | 'action' | 'recovery' | 'room' | 'system';
}

// In-memory fallbacks for non-browser / test environments
let memoryRecentlyViewed: string | null = null;
let memorySessionActivity: string | null = null;
let memoryUserRooms: string | null = null;

export function _resetCustomerContextFallbacksForTesting(): void {
  memoryRecentlyViewed = null;
  memorySessionActivity = null;
  memoryUserRooms = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECENTLY_VIEWED_KEY);
      localStorage.removeItem(SESSION_ACTIVITY_KEY);
      localStorage.removeItem(USER_ROOMS_KEY);
    }
  } catch {}
}

/* =========================================================================
   1. RECENTLY VIEWED
   ========================================================================= */

export function loadRecentlyViewed(
  knownEvents: SportsEvent[] = [],
  excludeEventId?: string
): RecentlyViewedItem[] {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    } else {
      raw = memoryRecentlyViewed;
    }

    if (!raw) return [];
    const parsed: RecentlyViewedItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter valid events and apply exclusion (e.g. active Continue Playing fixture)
    const valid = parsed.filter(item => {
      if (!item || !item.eventId) return false;
      if (excludeEventId && item.eventId === excludeEventId) return false;
      if (knownEvents.length > 0) {
        return knownEvents.some(e => e.id === item.eventId);
      }
      return true;
    });

    return valid.slice(0, 5);
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(
  event: SportsEvent,
  knownEvents: SportsEvent[] = []
): RecentlyViewedItem[] {
  try {
    const existing = loadRecentlyViewed(knownEvents);
    const newItem: RecentlyViewedItem = {
      eventId: event.id,
      eventName: `${event.homeTeam} vs ${event.awayTeam}`,
      sportId: event.sportId,
      sportName: event.sportName || 'Football',
      tournament: event.tournament || '',
      isLive: Boolean(event.isLive),
      score: event.score,
      timestamp: Date.now(),
    };

    // Deduplicate: remove existing occurrence of this event
    const filtered = existing.filter(item => item.eventId !== event.id);
    const updated = [newItem, ...filtered].slice(0, 5);

    const serialized = JSON.stringify(updated);
    memoryRecentlyViewed = serialized;
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(RECENTLY_VIEWED_KEY, serialized);
    }

    return updated;
  } catch {
    return [];
  }
}

export function clearRecentlyViewed(): void {
  memoryRecentlyViewed = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(RECENTLY_VIEWED_KEY);
    }
  } catch {}
}

/* =========================================================================
   2. MY LIVE ROOMS
   ========================================================================= */

export function loadUserRooms(
  knownEvents: SportsEvent[] = [],
  availableRooms: LiveMatchRoom[] = []
): UserRoomAssociation[] {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      raw = localStorage.getItem(USER_ROOMS_KEY);
    } else {
      raw = memoryUserRooms;
    }

    if (!raw) return [];
    const parsed: UserRoomAssociation[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validate: associated event must still exist and room must be valid
    const valid = parsed.filter(item => {
      if (!item || !item.roomId || !item.roomCode || !item.eventId) return false;
      if (knownEvents.length > 0) {
        const evExists = knownEvents.some(e => e.id === item.eventId);
        if (!evExists) return false;
      }
      if (availableRooms.length > 0) {
        const roomExists = availableRooms.some(r => r.roomId === item.roomId || r.roomCode === item.roomCode);
        if (!roomExists) return false;
      }
      return true;
    });

    return valid;
  } catch {
    return [];
  }
}

export function recordUserRoom(
  room: LiveMatchRoom,
  role: 'host' | 'participant'
): UserRoomAssociation[] {
  try {
    const existing = loadUserRooms();
    const newAssoc: UserRoomAssociation = {
      roomId: room.roomId,
      roomCode: room.roomCode,
      roomName: room.roomName,
      eventId: room.eventId,
      sportId: room.sportId,
      role,
      joinedAt: Date.now(),
    };

    // Deduplicate by roomId
    const filtered = existing.filter(r => r.roomId !== room.roomId);
    const updated = [newAssoc, ...filtered];

    const serialized = JSON.stringify(updated);
    memoryUserRooms = serialized;
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(USER_ROOMS_KEY, serialized);
    }

    return updated;
  } catch {
    return [];
  }
}

export function clearUserRooms(): void {
  memoryUserRooms = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(USER_ROOMS_KEY);
    }
  } catch {}
}

/* =========================================================================
   3. SESSION ACTIVITY (Canonical Event Projection)
   ========================================================================= */

const MEANINGFUL_EVENT_TYPES: Set<CanonicalEventType> = new Set([
  'SESSION_STARTED',
  'SPORT_VIEWED',
  'EVENT_VIEWED',
  'MARKET_VIEWED',
  'SELECTION_ADDED',
  'BETSLIP_OPENED',
  'ACTION_STARTED',
  'CONNECTION_LOST',
  'RECOVERY_STARTED',
  'CONNECTION_RESTORED',
  'RECOVERY_COMPLETED',
  'SESSION_RESUMED',
  'ROOM_JOINED',
  'ROOM_CREATED',
  'ROOM_MESSAGE_SENT',
  'ROOM_REACTION',
]);

/**
 * Projects a canonical event into neutral, experience-focused activity copy
 * NEVER exposes stake history, account balances, or financial outcomes.
 */
export function projectCanonicalEventToActivity(event: CanonicalEvent): SessionActivityItem | null {
  if (!MEANINGFUL_EVENT_TYPES.has(event.eventType)) {
    return null;
  }

  let description = '';
  let iconType: SessionActivityItem['iconType'] = 'view';
  let badge: string | undefined = undefined;

  switch (event.eventType) {
    case 'SESSION_STARTED':
      description = 'Session started';
      iconType = 'system';
      break;
    case 'SPORT_VIEWED':
      description = `Explored ${event.metadata?.sportName || event.entityContext?.sportName || 'Sports'}`;
      iconType = 'view';
      break;
    case 'EVENT_VIEWED':
      description = `Viewed ${
        event.metadata?.homeTeam && event.metadata?.awayTeam
          ? `${event.metadata.homeTeam} vs ${event.metadata.awayTeam}`
          : event.entityContext?.eventName || 'Match'
      }`;
      iconType = 'view';
      break;
    case 'MARKET_VIEWED':
      description = `Opened ${event.metadata?.marketName || event.entityContext?.marketName || 'Market'}`;
      iconType = 'view';
      break;
    case 'SELECTION_ADDED':
      description = `Added ${event.metadata?.marketName || 'selection'} to slip`;
      iconType = 'action';
      break;
    case 'BETSLIP_OPENED':
      description = 'Opened betslip';
      iconType = 'action';
      break;
    case 'ACTION_STARTED':
      description = 'Action submitted';
      iconType = 'action';
      badge = 'Protected';
      break;
    case 'CONNECTION_LOST':
      description = 'Connection interrupted — Lifeboat engaged';
      iconType = 'recovery';
      badge = 'Safe Mode';
      break;
    case 'RECOVERY_STARTED':
      description = 'Re-establishing session connection';
      iconType = 'recovery';
      break;
    case 'CONNECTION_RESTORED':
      description = 'Connection restored';
      iconType = 'recovery';
      break;
    case 'RECOVERY_COMPLETED':
      description = 'Session state recovered safely';
      iconType = 'recovery';
      badge = 'Reconciled';
      break;
    case 'SESSION_RESUMED':
      description = `Session resumed${event.metadata?.targetFixture ? ` (${event.metadata.targetFixture})` : ''}`;
      iconType = 'system';
      badge = 'Resumed';
      break;
    case 'ROOM_CREATED':
      description = `Created room ${event.metadata?.roomName || ''}`.trim();
      iconType = 'room';
      badge = 'Host';
      break;
    case 'ROOM_JOINED':
      description = `Joined ${event.metadata?.roomName || 'Live Room'}`;
      iconType = 'room';
      break;
    case 'ROOM_MESSAGE_SENT':
      description = 'Shared message in Live Room';
      iconType = 'room';
      break;
    case 'ROOM_REACTION':
      description = `Reacted with ${event.metadata?.emoji || 'emoji'} in Live Room`;
      iconType = 'room';
      break;
    default:
      return null;
  }

  return {
    id: `act-${event.id}`,
    eventType: event.eventType,
    description,
    timestamp: event.timestamp,
    badge,
    iconType,
  };
}

export function loadSessionActivity(): SessionActivityItem[] {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      raw = localStorage.getItem(SESSION_ACTIVITY_KEY);
    } else {
      raw = memorySessionActivity;
    }

    if (!raw) return [];
    const parsed: SessionActivityItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Most recent 10 events, newest first
    return parsed.slice(0, 10);
  } catch {
    return [];
  }
}

export function recordSessionActivity(event: CanonicalEvent): SessionActivityItem[] {
  try {
    const projected = projectCanonicalEventToActivity(event);
    if (!projected) {
      return loadSessionActivity();
    }

    const existing = loadSessionActivity();
    // Prepend new activity and cap at 10 items
    const updated = [projected, ...existing].slice(0, 10);

    const serialized = JSON.stringify(updated);
    memorySessionActivity = serialized;
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(SESSION_ACTIVITY_KEY, serialized);
    }

    return updated;
  } catch {
    return [];
  }
}

export function clearSessionActivity(): void {
  memorySessionActivity = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(SESSION_ACTIVITY_KEY);
    }
  } catch {}
}

/**
 * Cleanly reset all customer context layers on Reset Demo
 */
export function resetCustomerContext(): void {
  clearRecentlyViewed();
  clearUserRooms();
  clearSessionActivity();
}

