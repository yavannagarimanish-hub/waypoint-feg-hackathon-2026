import {
  CanonicalEvent,
  SessionMemory,
  UnifiedSessionState,
  SportsEvent,
  SlipItem,
} from '../types/canonical';

export const SESSION_MEMORY_KEY = 'waypoint_session_memory';

/**
 * Deterministic Freshness Policy:
 * Session Memory is valid for 24 hours (86,400,000 ms) from lastSeenAt.
 * Stale memory is discarded to prevent restoring outdated odds/fixtures.
 */
export const SESSION_MEMORY_FRESHNESS_MS = 24 * 60 * 60 * 1000;

// In-memory fallback for test or non-browser environments
let memoryFallback: string | null = null;

/**
 * Test helper to inject raw strings into storage
 */
export function _setRawMemoryForTesting(raw: string | null): void {
  memoryFallback = raw;
  try {
    if (typeof localStorage !== 'undefined') {
      if (raw === null) {
        localStorage.removeItem(SESSION_MEMORY_KEY);
      } else {
        localStorage.setItem(SESSION_MEMORY_KEY, raw);
      }
    }
  } catch {}
}

/**
 * Deterministic Resumability Rules
 * A session is resumable when there is meaningful unfinished context:
 * - User viewed a specific fixture/event and left before completing journey
 * - User was viewing a specific market
 * - User had active unconfirmed selections in the betslip
 * - User was interrupted / connection lost during active session
 * - User was inside a Live Match Room
 * - A pending action was protected / recovering
 *
 * NOT resumable:
 * - Empty session (discovery screen, no sport/event viewed)
 * - Already completed session (COMPLETION stage with no pending context or new intent)
 * - Malformed, corrupted, or missing event data
 * - Stale memory (> 24 hours old)
 */
export function evaluateResumability(
  state: UnifiedSessionState,
  eventsLog: CanonicalEvent[],
  activeEvent: SportsEvent | null,
  betslip: SlipItem[] = []
): { resumable: boolean; reason?: string } {
  // 1. Interrupted or recovering sessions are always resumable
  if (
    state.healthState === 'AT_RISK' ||
    state.healthState === 'RECOVERING' ||
    state.healthState === 'FRICTION' ||
    state.recoveryState.isRecovering ||
    state.pendingAction.inFlight
  ) {
    return {
      resumable: true,
      reason: 'Session interrupted while active. Action context protected.',
    };
  }

  // 2. Active selections in betslip but not completed
  if (betslip.length > 0 && state.journeyStage !== 'COMPLETION') {
    return {
      resumable: true,
      reason: `You have ${betslip.length} unfinished selection${betslip.length > 1 ? 's' : ''} in progress.`,
    };
  }

  // 3. User was inside a Live Match Room
  if (state.currentScreen === 'room' && state.socialRoomContext.activeRoomId) {
    return {
      resumable: true,
      reason: 'You were actively participating in a Live Match Room.',
    };
  }

  // 4. Meaningful fixture/market exploration (not on default empty home)
  const hasSpecificEvent = Boolean(
    activeEvent &&
    (state.currentEvent?.id || activeEvent.id) &&
    state.journeyStage !== 'DISCOVERY'
  );

  if (hasSpecificEvent) {
    if (state.currentMarket || state.currentSelection) {
      return {
        resumable: true,
        reason: `You were viewing ${state.currentMarket?.name || 'markets'} for ${activeEvent?.homeTeam} vs ${activeEvent?.awayTeam}.`,
      };
    }
    if (state.journeyStage === 'EXPLORATION' || state.journeyStage === 'DECISION') {
      return {
        resumable: true,
        reason: `You were exploring ${activeEvent?.homeTeam} vs ${activeEvent?.awayTeam}.`,
      };
    }
  }

  // 5. If journey completed and no uncommitted items, it is not resumable
  if (state.journeyStage === 'COMPLETION' && betslip.length === 0) {
    return {
      resumable: false,
    };
  }

  return {
    resumable: false,
  };
}

/**
 * Creates a structured SessionMemory snapshot from current session state
 */
export function buildSessionMemory(
  state: UnifiedSessionState,
  eventsLog: CanonicalEvent[],
  activeEvent: SportsEvent | null,
  betslip: SlipItem[] = []
): SessionMemory | null {
  const { resumable, reason } = evaluateResumability(state, eventsLog, activeEvent, betslip);
  if (!resumable) return null;

  const isInterrupted = Boolean(
    state.healthState === 'AT_RISK' ||
    state.healthState === 'RECOVERING' ||
    state.recoveryState.isRecovering ||
    state.pendingAction.inFlight
  );

  return {
    sessionId: state.sessionId,
    lastEventId: activeEvent?.id || state.currentEvent?.id,
    lastSport: state.currentSport || undefined,
    lastCompetition: activeEvent?.tournament,
    lastFixture: activeEvent
      ? {
          id: activeEvent.id,
          name: `${activeEvent.homeTeam} vs ${activeEvent.awayTeam}`,
          homeTeam: activeEvent.homeTeam,
          awayTeam: activeEvent.awayTeam,
          isLive: activeEvent.isLive,
        }
      : undefined,
    lastMarket: state.currentMarket || undefined,
    lastSelection: state.currentSelection || undefined,
    savedBetslip: betslip.length > 0 ? [...betslip] : undefined,
    journeyStage: state.journeyStage,
    healthState: state.healthState,
    interrupted: isInterrupted,
    resumable: true,
    interruptionReason: reason,
    hasProtectedAction: state.pendingAction.inFlight || Boolean(state.recoveryState.recoveredReceipt),
    protectedActionPayload: state.pendingAction.payload || null,
    roomId: state.socialRoomContext.activeRoomId || undefined,
    lastSeenAt: Date.now(),
  };
}

/**
 * Save session memory to localStorage (or in-memory fallback in non-browser env)
 */
export function saveSessionMemory(memory: SessionMemory): void {
  try {
    const serialized = JSON.stringify(memory);
    memoryFallback = serialized;
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(SESSION_MEMORY_KEY, serialized);
    }
  } catch (err) {
    console.warn('Failed to persist session memory:', err);
  }
}

/**
 * Load session memory with freshness, schema, and fixture/market validity checks
 */
export function loadSessionMemory(knownEvents: SportsEvent[] = []): SessionMemory | null {
  try {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      raw = localStorage.getItem(SESSION_MEMORY_KEY);
    } else {
      raw = memoryFallback;
    }

    if (!raw) return null;

    const parsed: SessionMemory = JSON.parse(raw);

    // 1. Schema validation
    if (!parsed || typeof parsed !== 'object' || !parsed.sessionId) {
      clearSessionMemory();
      return null;
    }

    // 2. Deterministic Freshness Check (24-hour expiration)
    const now = Date.now();
    if (parsed.lastSeenAt && (now - parsed.lastSeenAt > SESSION_MEMORY_FRESHNESS_MS)) {
      clearSessionMemory();
      return null;
    }

    // 3. Live / Market / Fixture Validity Check against known synthetic dataset
    if (knownEvents.length > 0) {
      if (parsed.lastEventId) {
        const matchingEvent = knownEvents.find(e => e.id === parsed.lastEventId);
        if (!matchingEvent) {
          // Referencing obsolete or non-existent fixture
          clearSessionMemory();
          return null;
        }

        // Validate Market and Selection if present
        if (parsed.lastMarket) {
          const matchingMarket = matchingEvent.markets?.find(m => m.id === parsed.lastMarket?.id);
          if (!matchingMarket) {
            // Market no longer exists, discard invalid market context gracefully
            parsed.lastMarket = undefined;
            parsed.lastSelection = undefined;
          } else if (parsed.lastSelection) {
            const matchingSelection = matchingMarket.selections?.find(s => s.id === parsed.lastSelection?.id);
            if (!matchingSelection) {
              parsed.lastSelection = undefined;
            }
          }
        }

        // Filter saved betslip items: keep only selections whose event and market still exist
        if (parsed.savedBetslip && parsed.savedBetslip.length > 0) {
          const validatedSlip = parsed.savedBetslip.filter(item => {
            const ev = knownEvents.find(e => e.id === item.eventId);
            if (!ev) return false;
            const mk = ev.markets?.find(m => m.id === item.marketId);
            if (!mk) return false;
            return mk.selections?.some(s => s.id === item.selectionId);
          });
          parsed.savedBetslip = validatedSlip.length > 0 ? validatedSlip : undefined;
        }
      }
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to parse session memory, clearing invalid storage:', err);
    clearSessionMemory();
    return null;
  }
}

export const LIVE_TELEMETRY_KEY = 'waypoint_live_telemetry';

export interface AuthoritativeLiveTelemetry {
  sessionId: string;
  events: CanonicalEvent[];
  updatedAt: number;
}

let liveTelemetryFallback: AuthoritativeLiveTelemetry | null = null;

/**
 * Persists the authoritative live telemetry event log to localStorage for cross-route synchronization
 */
export function saveAuthoritativeLiveTelemetry(sessionId: string, events: CanonicalEvent[]): void {
  const payload: AuthoritativeLiveTelemetry = {
    sessionId,
    events,
    updatedAt: Date.now(),
  };
  liveTelemetryFallback = payload;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(LIVE_TELEMETRY_KEY, JSON.stringify(payload));
    }
  } catch {}
}

/**
 * Retrieves the authoritative live telemetry event log from localStorage (or fallback)
 */
export function loadAuthoritativeLiveTelemetry(): AuthoritativeLiveTelemetry | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const raw = localStorage.getItem(LIVE_TELEMETRY_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return liveTelemetryFallback;
}

/**
 * Clears the authoritative live telemetry from storage
 */
export function clearAuthoritativeLiveTelemetry(): void {
  liveTelemetryFallback = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(LIVE_TELEMETRY_KEY);
    }
  } catch {}
}

/**
 * Clear session memory
 */
export function clearSessionMemory(): void {
  memoryFallback = null;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(SESSION_MEMORY_KEY);
    }
  } catch {}
}
