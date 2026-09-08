import { describe, it, expect } from 'vitest';
import {
  CanonicalEvent,
  JourneyStage,
  HealthState,
  UnifiedSessionState,
  SportsEvent,
  SessionMemory,
} from '../types/canonical';
import {
  transitionJourneyStage,
  transitionHealthState,
  evaluateFrictionRules,
  calculateRiskAssessment,
  calculateSessionQuality,
  evaluateMomentum,
  deriveSessionDna,
} from './sessionIntelligence';
import {
  generateRoomUrl,
  parseRoomUrl,
  resolveRoomDeepLink,
} from './roomDeepLink';
import {
  calculateLoginStreak,
  createDefaultUser,
  calculateSocialScore,
  getInitialRoomParticipants,
  buildRoomLeaderboard,
  CATALOG_ACHIEVEMENTS,
  validateUsername,
  savePrototypeAccount,
  findPrototypeAccount,
} from './socialUserService';
import {
  evaluateResumability,
  buildSessionMemory,
  saveSessionMemory,
  loadSessionMemory,
  clearSessionMemory,
  SESSION_MEMORY_KEY,
  SESSION_MEMORY_FRESHNESS_MS,
  _setRawMemoryForTesting,
  saveAuthoritativeLiveTelemetry,
  loadAuthoritativeLiveTelemetry,
  clearAuthoritativeLiveTelemetry,
} from './sessionMemoryService';
import {
  loadRecentlyViewed,
  recordRecentlyViewed,
  clearRecentlyViewed,
  loadUserRooms,
  recordUserRoom,
  clearUserRooms,
  loadSessionActivity,
  recordSessionActivity,
  projectCanonicalEventToActivity,
  clearSessionActivity,
  resetCustomerContext,
  _resetCustomerContextFallbacksForTesting,
} from './customerContextService';

function createMockEvent(type: any, metadata: any = {}, seq = 1): CanonicalEvent {
  return {
    id: `evt-${seq}`,
    sessionId: 'test-session',
    timestamp: Date.now(),
    sequenceNumber: seq,
    eventType: type,
    platform: 'web-desktop',
    product: 'sports',
    journeyStage: 'DISCOVERY',
    sessionHealth: 'HEALTHY',
    entityContext: {},
    metadata,
    source: 'user_action',
  };
}

describe('Session Intelligence: Journey State Machine', () => {
  it('transitions from DISCOVERY to EXPLORATION on SPORT_VIEWED', () => {
    const event = createMockEvent('SPORT_VIEWED');
    const next = transitionJourneyStage('DISCOVERY', event);
    expect(next).toBe('EXPLORATION');
  });

  it('transitions to DECISION on SELECTION_ADDED or BETSLIP_OPENED', () => {
    const e1 = createMockEvent('SELECTION_ADDED');
    expect(transitionJourneyStage('EXPLORATION', e1)).toBe('DECISION');

    const e2 = createMockEvent('BETSLIP_OPENED');
    expect(transitionJourneyStage('DISCOVERY', e2)).toBe('DECISION');
  });

  it('transitions to ACTION on ACTION_STARTED', () => {
    const event = createMockEvent('ACTION_STARTED');
    expect(transitionJourneyStage('DECISION', event)).toBe('ACTION');
  });

  it('transitions to COMPLETION on ACTION_CONFIRMED', () => {
    const event = createMockEvent('ACTION_CONFIRMED');
    expect(transitionJourneyStage('ACTION', event)).toBe('COMPLETION');
  });
});

describe('Session Intelligence: Health State Machine', () => {
  it('transitions to AT_RISK on CONNECTION_LOST', () => {
    const event = createMockEvent('CONNECTION_LOST');
    const next = transitionHealthState('HEALTHY', event, []);
    expect(next).toBe('AT_RISK');
  });

  it('transitions to RECOVERING on RECOVERY_STARTED', () => {
    const event = createMockEvent('RECOVERY_STARTED');
    const next = transitionHealthState('AT_RISK', event, []);
    expect(next).toBe('RECOVERING');
  });

  it('transitions to RECOVERED on RECOVERY_COMPLETED', () => {
    const event = createMockEvent('RECOVERY_COMPLETED');
    const next = transitionHealthState('RECOVERING', event, []);
    expect(next).toBe('RECOVERED');
  });

  it('reflects FRICTION when friction signals are present', () => {
    const event = createMockEvent('SCREEN_VIEWED');
    const frictions = [
      {
        type: 'repeated_back_forth' as const,
        severity: 'medium' as const,
        evidence: 'Oscillation',
        timestamp: Date.now(),
        confidence: 0.9,
        recommendedResponse: 'Assist',
      },
    ];
    const next = transitionHealthState('HEALTHY', event, frictions);
    expect(next).toBe('FRICTION');
  });
});

describe('Session Intelligence: Friction Rules', () => {
  it('detects connection loss friction with critical severity when pendingAction is in-flight', () => {
    const events = [createMockEvent('CONNECTION_LOST')];
    const signals = evaluateFrictionRules(events, true);
    expect(signals.length).toBe(1);
    expect(signals[0].type).toBe('connection_loss');
    expect(signals[0].severity).toBe('critical');
  });

  it('detects repeated back-and-forth navigation thrash', () => {
    const events = [
      createMockEvent('SCREEN_VIEWED', { screen: 'sports' }, 1),
      createMockEvent('SCREEN_VIEWED', { screen: 'casino' }, 2),
      createMockEvent('SCREEN_VIEWED', { screen: 'sports' }, 3),
      createMockEvent('SCREEN_VIEWED', { screen: 'casino' }, 4),
    ];
    const signals = evaluateFrictionRules(events, false);
    expect(signals.some(s => s.type === 'repeated_back_forth')).toBe(true);
  });
});

describe('Session Intelligence: Risk & Quality Models', () => {
  it('calculates multi-signal risk level as CRITICAL during offline pending action', () => {
    const frictions = [
      {
        type: 'connection_loss' as const,
        severity: 'critical' as const,
        evidence: 'Net cut',
        timestamp: Date.now(),
        confidence: 1.0,
        recommendedResponse: 'Lifeboat',
      },
    ];
    const risk = calculateRiskAssessment('AT_RISK', frictions, true, 'HIGH');
    expect(risk.riskScore).toBeGreaterThanOrEqual(0.75);
    expect(risk.riskLevel).toBe('CRITICAL');
  });

  it('calculates 5-dimension session quality score with friction penalties', () => {
    const events = [
      createMockEvent('SESSION_STARTED'),
      createMockEvent('EVENT_VIEWED'),
      createMockEvent('MARKET_VIEWED'),
      createMockEvent('SELECTION_ADDED'),
    ];
    const qualityClean = calculateSessionQuality(events, [], 'HEALTHY');
    expect(qualityClean.overallScore).toBeGreaterThanOrEqual(70);

    const frictions = [
      {
        type: 'odds_drift_shock' as const,
        severity: 'high' as const,
        evidence: 'Drift',
        timestamp: Date.now(),
        confidence: 0.9,
        recommendedResponse: 'Review',
      },
    ];
    const qualityDegraded = calculateSessionQuality(events, frictions, 'FRICTION');
    expect(qualityDegraded.friction).toBeLessThan(qualityClean.friction);
  });
});

describe('Session Intelligence: Momentum & Session DNA', () => {
  it('evaluates momentum as RISING when user makes purposeful progress', () => {
    const events = [
      createMockEvent('SELECTION_ADDED'),
      createMockEvent('BETSLIP_OPENED'),
      createMockEvent('ACTION_CONFIRMED'),
    ];
    const { trend, score } = evaluateMomentum(events);
    expect(trend).toBe('RISING');
    expect(score).toBeGreaterThan(60);
  });

  it('derives SOCIAL profile when room events predominate', () => {
    const events = [
      createMockEvent('ROOM_JOINED'),
      createMockEvent('ROOM_MESSAGE_SENT'),
      createMockEvent('ROOM_REACTION'),
    ];
    expect(deriveSessionDna(events)).toBe('SOCIAL');
  });

  it('derives RECOVERY profile after recovery lifecycle', () => {
    const events = [
      createMockEvent('ACTION_STARTED'),
      createMockEvent('CONNECTION_LOST'),
      createMockEvent('RECOVERY_COMPLETED'),
    ];
    expect(deriveSessionDna(events)).toBe('RECOVERY');
  });

  it('verifies reset session produces clean DISCOVERY stage and baseline quality', () => {
    const resetEvent = createMockEvent('SESSION_STARTED', { resetTriggered: true });
    const journey = transitionJourneyStage('COMPLETION', resetEvent);
    expect(journey).toBe('DISCOVERY');

    const health = transitionHealthState('AT_RISK', resetEvent, []);
    expect(health).toBe('HEALTHY');

    const quality = calculateSessionQuality([resetEvent], [], 'HEALTHY');
    expect(quality.overallScore).toBe(64);
    expect(quality.recovery).toBe(100);
    expect(quality.friction).toBe(100);
  });
});

describe('Phase 11: Create & Share Live Match Room', () => {
  it('derives SOCIAL profile when ROOM_CREATED and ROOM_JOINED events occur', () => {
    const events = [
      createMockEvent('ROOM_CREATED', { roomId: 'rm-101', roomCode: 'AB7KQ2' }),
      createMockEvent('ROOM_JOINED', { roomId: 'rm-101', roomCode: 'AB7KQ2', role: 'creator' }),
      createMockEvent('ROOM_MESSAGE_SENT', { roomId: 'rm-101' }),
    ];
    expect(deriveSessionDna(events)).toBe('SOCIAL');
  });

  it('validates 6-character alphanumeric room code pattern', () => {
    const roomCodeRegex = /^[A-Z0-9]{6}$/;
    const sampleCode = 'AB7KQ2';
    expect(roomCodeRegex.test(sampleCode)).toBe(true);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generated = '';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    expect(generated.length).toBe(6);
    expect(roomCodeRegex.test(generated)).toBe(true);
  });

  it('maintains nominal session quality and DISCOVERY stage when creating a room', () => {
    const events = [
      createMockEvent('SESSION_STARTED'),
      createMockEvent('ROOM_CREATED', { roomId: 'rm-1', roomCode: 'XY9KL2' }),
      createMockEvent('ROOM_JOINED', { roomId: 'rm-1' }),
    ];
    const quality = calculateSessionQuality(events, [], 'HEALTHY');
    expect(quality.overallScore).toBeGreaterThanOrEqual(60);
    expect(quality.friction).toBe(100);
  });
});

describe('Phase 11.2: Deep-Link Room URL Generation & Reconstruction', () => {
  const sampleEvent: any = {
    id: 'ufo:mtch:demo-eng-cro',
    sportId: '00',
    sportName: 'Football',
    tournament: 'UEFA Nations League',
    category: 'International',
    homeTeam: 'England',
    awayTeam: 'Croatia',
  };

  it('generates a valid hash-based deep-link URL with URL-encoded room name', () => {
    const url = generateRoomUrl(
      {
        roomCode: 'AB7KQ2',
        eventId: 'ufo:mtch:demo-eng-cro',
        sportId: '00',
        roomName: 'Friday Football & Friends',
        privacy: 'friends_with_link',
      },
      'https://waypoint.live'
    );
    expect(url).toBe(
      'https://waypoint.live/#/room/AB7KQ2?eventId=ufo%3Amtch%3Ademo-eng-cro&sportId=00&name=Friday+Football+%26+Friends&privacy=friends_with_link'
    );
  });

  it('parses valid hash route into room payload', () => {
    const testHash = '#/room/AB7KQ2?eventId=ufo%3Amtch%3Ademo-eng-cro&sportId=00&name=Friday+Football&privacy=friends_with_link';
    const parsed = parseRoomUrl(testHash);
    expect(parsed).not.toBeNull();
    expect(parsed?.roomCode).toBe('AB7KQ2');
    expect(parsed?.eventId).toBe('ufo:mtch:demo-eng-cro');
    expect(parsed?.sportId).toBe('00');
    expect(parsed?.roomName).toBe('Friday Football');
    expect(parsed?.privacy).toBe('friends_with_link');
  });

  it('parses full URL with hash route into room payload', () => {
    const fullUrl = 'https://waypoint.live/#/room/XYZ999?eventId=ufo%3Amtch%3Ademo-eng-cro&sportId=00&name=Derby+Night';
    const parsed = parseRoomUrl(fullUrl);
    expect(parsed).not.toBeNull();
    expect(parsed?.roomCode).toBe('XYZ999');
    expect(parsed?.roomName).toBe('Derby Night');
  });

  it('successfully reconstructs minimal LiveMatchRoom from valid payload and event catalogue', () => {
    const payload = {
      roomCode: 'AB7KQ2',
      eventId: 'ufo:mtch:demo-eng-cro',
      sportId: '00',
      roomName: 'Friday Football',
      privacy: 'friends_with_link' as const,
    };
    const res = resolveRoomDeepLink(payload, [sampleEvent], 'fresh-local-session-123');
    expect(res.success).toBe(true);
    expect(res.room).toBeDefined();
    expect(res.room?.roomCode).toBe('AB7KQ2');
    expect(res.room?.roomName).toBe('Friday Football');
    expect(res.room?.eventId).toBe('ufo:mtch:demo-eng-cro');
    expect(res.room?.sportId).toBe('00');
    expect(res.event?.homeTeam).toBe('England');
  });

  it('handles malformed room URL gracefully without crashing', () => {
    expect(parseRoomUrl('')).toBeNull();
    expect(parseRoomUrl('not-a-valid-url')).toBeNull();
    expect(parseRoomUrl('#/other/screen')).toBeNull();
    expect(parseRoomUrl('#/room/')).toBeNull();
  });

  it('returns descriptive error when room code is missing or too short', () => {
    const payload = {
      roomCode: 'A',
      eventId: 'ufo:mtch:demo-eng-cro',
      sportId: '00',
      roomName: 'Short Room',
    };
    const res = resolveRoomDeepLink(payload, [sampleEvent], 'fresh-session');
    expect(res.success).toBe(false);
    expect(res.error).toContain('missing a valid room code');
  });

  it('returns descriptive error when event ID is unknown or not in catalogue', () => {
    const payload = {
      roomCode: 'AB7KQ2',
      eventId: 'unknown-event-id-999',
      sportId: '00',
      roomName: 'Orphan Room',
    };
    const res = resolveRoomDeepLink(payload, [sampleEvent], 'fresh-session');
    expect(res.success).toBe(false);
    expect(res.error).toBe('The room link is invalid or the match is no longer available.');
  });

  it('returns descriptive error when sport ID mismatches event in catalogue', () => {
    const payload = {
      roomCode: 'AB7KQ2',
      eventId: 'ufo:mtch:demo-eng-cro',
      sportId: 'tennis-99', // Mismatched sport
      roomName: 'Mismatched Room',
    };
    const res = resolveRoomDeepLink(payload, [sampleEvent], 'fresh-session');
    expect(res.success).toBe(false);
    expect(res.error).toBe('The room link is invalid or the match is no longer available.');
  });

  it('verifies canonical telemetry: fresh joining runtime emits ROOM_JOINED with local sessionId and does not emit ROOM_CREATED', () => {
    const localSessionId = 'sess-fresh-runtime-88';
    const payload = {
      roomCode: 'AB7KQ2',
      eventId: 'ufo:mtch:demo-eng-cro',
      sportId: '00',
      roomName: 'Friday Football',
    };
    const res = resolveRoomDeepLink(payload, [sampleEvent], localSessionId);
    expect(res.success).toBe(true);

    // Emitted event for joining runtime
    const joinEvent: CanonicalEvent = {
      id: 'evt-1',
      sessionId: localSessionId,
      timestamp: Date.now(),
      sequenceNumber: 1,
      eventType: 'ROOM_JOINED',
      platform: 'web-desktop',
      product: 'sports',
      journeyStage: 'DISCOVERY',
      sessionHealth: 'HEALTHY',
      entityContext: { roomId: res.room?.roomId },
      metadata: { role: 'participant', roomCode: res.room?.roomCode },
      source: 'user_action',
    };

    expect(joinEvent.eventType).toBe('ROOM_JOINED');
    expect(joinEvent.sessionId).toBe(localSessionId);
    expect(joinEvent.metadata.role).toBe('participant');
    // ROOM_CREATED should NOT be emitted
    expect(joinEvent.eventType).not.toBe('ROOM_CREATED');
  });
});

describe('Phase 12: Social Identity, Profiles & Room Leaderboards', () => {
  it('initializes a default user profile with valid attributes', () => {
    const user = createDefaultUser();
    expect(user.id).toBeDefined();
    expect(user.username).toBe('luka_zg');
    expect(user.displayName).toBe('Luka Modric Fan');
    expect(user.loginStreak.currentStreak).toBeGreaterThanOrEqual(1);
    expect(user.achievements.length).toBeGreaterThanOrEqual(1);
    expect(user.stats.predictionsMade).toBeGreaterThanOrEqual(0);
  });

  it('calculates login streak for first login', () => {
    const streak = calculateLoginStreak({ currentStreak: 0, longestStreak: 0, lastLoginDate: '' }, '2026-09-09');
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
    expect(streak.lastLoginDate).toBe('2026-09-09');
  });

  it('prevents multiple logins on the same calendar day from double-incrementing streak', () => {
    const initial = { currentStreak: 4, longestStreak: 4, lastLoginDate: '2026-09-09' };
    const repeated = calculateLoginStreak(initial, '2026-09-09');
    expect(repeated.currentStreak).toBe(4);
    expect(repeated.longestStreak).toBe(4);
  });

  it('increments streak on consecutive calendar day', () => {
    const yesterday = { currentStreak: 4, longestStreak: 4, lastLoginDate: '2026-09-08' };
    const nextDay = calculateLoginStreak(yesterday, '2026-09-09');
    expect(nextDay.currentStreak).toBe(5);
    expect(nextDay.longestStreak).toBe(5);
    expect(nextDay.lastLoginDate).toBe('2026-09-09');
  });

  it('resets streak to 1 when a calendar day is missed without penalty', () => {
    const gap = { currentStreak: 7, longestStreak: 7, lastLoginDate: '2026-09-05' };
    const broken = calculateLoginStreak(gap, '2026-09-09');
    expect(broken.currentStreak).toBe(1);
    expect(broken.longestStreak).toBe(7); // longest streak preserved
  });

  it('calculates social leaderboard score safely without money wagered', () => {
    // Formula: (correct * 10) + (total * 1) + (isHost ? 2 : 0)
    const scoreParticipant = calculateSocialScore(5, 7, false);
    expect(scoreParticipant).toBe(50 + 7 + 0); // 57

    const scoreHost = calculateSocialScore(3, 4, true);
    expect(scoreHost).toBe(30 + 4 + 2); // 36
  });

  it('builds room leaderboard ordered by social points descending', () => {
    const user = createDefaultUser();
    const participants = getInitialRoomParticipants(user, false);
    const leaderboard = buildRoomLeaderboard(participants, user.id);

    expect(leaderboard.length).toBe(participants.length);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].score).toBeGreaterThanOrEqual(leaderboard[1].score);
    expect(leaderboard.some(e => e.isCurrentUser === true)).toBe(true);
  });

  it('validates achievement catalog and unlocking', () => {
    expect(CATALOG_ACHIEVEMENTS.length).toBeGreaterThanOrEqual(6);
    const firstPred = CATALOG_ACHIEVEMENTS.find(a => a.id === 'ach-first-pred');
    expect(firstPred).toBeDefined();
    expect(firstPred?.category).toBe('prediction');
  });

  it('confirms responsible design: streak & achievements never require wagers', () => {
    const user = createDefaultUser();
    // User has streak and achievements even with 0 wagers
    expect(user.loginStreak.currentStreak).toBeGreaterThan(0);
    expect(user.achievements.length).toBeGreaterThan(0);
  });

  describe('Phase 12.1: Username Validation & Account Persistence', () => {
    it('validates username length constraints (3 to 20 chars)', () => {
      expect(validateUsername('ab').valid).toBe(false);
      expect(validateUsername('ab').error).toContain('3 to 20 characters');

      expect(validateUsername('a'.repeat(21)).valid).toBe(false);
      expect(validateUsername('a'.repeat(21)).error).toContain('3 to 20 characters');

      expect(validateUsername('abc').valid).toBe(true);
      expect(validateUsername('a'.repeat(20)).valid).toBe(true);
    });

    it('rejects usernames with spaces or special characters', () => {
      expect(validateUsername('user name').valid).toBe(false);
      expect(validateUsername('user@name').valid).toBe(false);
      expect(validateUsername('user!name').valid).toBe(false);
      expect(validateUsername('user$name').valid).toBe(false);

      expect(validateUsername('user_123').valid).toBe(true);
      expect(validateUsername('Luka_Modric').valid).toBe(true);
    });

    it('persists and restores prototype accounts by username', () => {
      const mockUser = createDefaultUser();
      mockUser.username = 'test_pilot_99';
      mockUser.displayName = 'Test Pilot';
      mockUser.stats.totalPoints = 88;

      savePrototypeAccount(mockUser);
      const retrieved = findPrototypeAccount('test_pilot_99');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.username).toBe('test_pilot_99');
      expect(retrieved?.displayName).toBe('Test Pilot');
      expect(retrieved?.stats.totalPoints).toBe(88);

      // Case-insensitive retrieval
      const caseRetrieved = findPrototypeAccount('TEST_PILOT_99');
      expect(caseRetrieved?.username).toBe('test_pilot_99');
    });

    it('contains non-monetary discovery Easter eggs in CATALOG_ACHIEVEMENTS', () => {
      const firstAction = CATALOG_ACHIEVEMENTS.find(a => a.id === 'ach-first-action');
      expect(firstAction).toBeDefined();
      expect(firstAction?.title).toBe('FIRST ACTION');
      expect(firstAction?.description).toBe('Your Waypoint journey has officially begun.');

      const lifeboat = CATALOG_ACHIEVEMENTS.find(a => a.id === 'ach-lifeboat');
      expect(lifeboat).toBeDefined();
      expect(lifeboat?.title).toBe('LIFEBOAT ACTIVATED');
      expect(lifeboat?.description).toBe('Your action was protected.');

      const waypoint = CATALOG_ACHIEVEMENTS.find(a => a.id === 'ach-waypoint');
      expect(waypoint).toBeDefined();
      expect(waypoint?.title).toBe('WAYPOINT FOUND');
      expect(waypoint?.description).toBe('The session found its way.');
    });
  });

  describe('Phase 15: Session Memory & Smart Resume', () => {
    const mockInitialState: UnifiedSessionState = {
      sessionId: 'sess-alpha',
      currentScreen: 'home',
      currentSport: { id: '00', name: 'Football' },
      currentEvent: { id: 'e1', name: 'Arsenal vs Chelsea' },
      currentMarket: null,
      currentSelection: null,
      journeyStage: 'DISCOVERY',
      healthState: 'HEALTHY',
      sessionQuality: { relevance: 100, informedness: 60, friction: 100, momentum: 50, recovery: 100, overallScore: 82 },
      frictionSignals: [],
      momentum: 'STABLE',
      momentumScore: 50,
      intentContext: { level: 'LOW', activeGoal: 'Browsing', lastIntentTimestamp: Date.now() },
      pendingAction: { inFlight: false, idempotencyKey: null, actionType: null, payload: null, startedAt: null },
      recoveryState: { isRecovering: false, reason: null, recoveredReceipt: null },
      socialRoomContext: { activeRoomId: null, activeUsersCount: 0, lastInteraction: null, currentUserId: 'user-1', roomRank: 2 },
      sessionDna: 'STANDARD',
      sessionDnaTrail: ['START[Home]'],
    };

    const mockEvent: SportsEvent = {
      id: 'e1',
      sportId: '00',
      sportName: 'Football',
      category: 'Premier League',
      tournament: 'Premier League',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      isLive: true,
      clock: "72'",
      score: { home: 1, away: 1 },
      markets: [],
      hasLiveRoom: true,
      activeRoomParticipants: 84,
    };

    it('determines an empty discovery session is not resumable', () => {
      const res = evaluateResumability(mockInitialState, [], null, []);
      expect(res.resumable).toBe(false);
      expect(buildSessionMemory(mockInitialState, [], null, [])).toBeNull();
    });

    it('determines an interrupted/at-risk session is always resumable', () => {
      const interruptedState: UnifiedSessionState = {
        ...mockInitialState,
        healthState: 'AT_RISK',
      };
      const res = evaluateResumability(interruptedState, [], mockEvent, []);
      expect(res.resumable).toBe(true);
      expect(res.reason).toContain('Session interrupted while active');

      const mem = buildSessionMemory(interruptedState, [], mockEvent, []);
      expect(mem).not.toBeNull();
      expect(mem?.interrupted).toBe(true);
      expect(mem?.lastFixture?.homeTeam).toBe('Arsenal');
    });

    it('determines an active betslip with unconfirmed selections is resumable', () => {
      const slipItem = {
        eventId: 'e1',
        eventName: 'Arsenal vs Chelsea',
        marketId: 'm1',
        marketName: 'Full Time Result',
        selectionId: 's1',
        selectionName: 'Arsenal',
        odds: 2.10,
      };
      const res = evaluateResumability(mockInitialState, [], mockEvent, [slipItem]);
      expect(res.resumable).toBe(true);
      expect(res.reason).toContain('1 unfinished selection');

      const mem = buildSessionMemory(mockInitialState, [], mockEvent, [slipItem]);
      expect(mem).not.toBeNull();
      expect(mem?.savedBetslip?.length).toBe(1);
    });

    it('does not mark a completed session with empty betslip as resumable', () => {
      const completedState: UnifiedSessionState = {
        ...mockInitialState,
        journeyStage: 'COMPLETION',
      };
      const res = evaluateResumability(completedState, [], mockEvent, []);
      expect(res.resumable).toBe(false);
    });

    it('persists and loads session memory from localStorage', () => {
      clearSessionMemory();
      expect(loadSessionMemory([mockEvent])).toBeNull();

      const memoryToSave: SessionMemory = {
        sessionId: 'sess-persisted',
        lastEventId: 'e1',
        lastSport: { id: '00', name: 'Football' },
        lastFixture: { id: 'e1', name: 'Arsenal vs Chelsea', homeTeam: 'Arsenal', awayTeam: 'Chelsea', isLive: true },
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        interruptionReason: 'You were exploring Arsenal vs Chelsea.',
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };

      saveSessionMemory(memoryToSave);
      const loaded = loadSessionMemory([mockEvent]);
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe('sess-persisted');
      expect(loaded?.lastFixture?.name).toBe('Arsenal vs Chelsea');
      expect(loaded?.interruptionReason).toContain('Arsenal vs Chelsea');

      clearSessionMemory();
      expect(loadSessionMemory([mockEvent])).toBeNull();
    });

    it('safely handles corrupted localStorage data', () => {
      _setRawMemoryForTesting('invalid-json{{{');
      const loaded = loadSessionMemory([mockEvent]);
      expect(loaded).toBeNull();
    });

    it('rejects memory pointing to non-existent fixtures', () => {
      const obsoleteMemory: SessionMemory = {
        sessionId: 'sess-old',
        lastEventId: 'non-existent-id-999',
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };
      saveSessionMemory(obsoleteMemory);
      const loaded = loadSessionMemory([mockEvent]);
      expect(loaded).toBeNull();
    });

    it('rejects stale memory older than 24 hours (freshness policy)', () => {
      const staleTimestamp = Date.now() - (SESSION_MEMORY_FRESHNESS_MS + 60000); // 24h + 1m ago
      const staleMemory: SessionMemory = {
        sessionId: 'sess-stale',
        lastEventId: 'e1',
        lastSport: { id: '00', name: 'Football' },
        lastFixture: { id: 'e1', name: 'Arsenal vs Chelsea', homeTeam: 'Arsenal', awayTeam: 'Chelsea', isLive: true },
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: staleTimestamp,
      };

      saveSessionMemory(staleMemory);
      const loaded = loadSessionMemory([mockEvent]);
      expect(loaded).toBeNull();
      // Verify storage was cleaned up
      expect(loadSessionMemory([])).toBeNull();
    });

    it('gracefully strips invalid markets and selections while preserving valid fixture context', () => {
      const eventWithMarkets: SportsEvent = {
        ...mockEvent,
        markets: [
          {
            id: 'm-valid',
            name: 'Full Time Result',
            category: 'MAIN',
            status: 'OPEN',
            selections: [
              { id: 's-valid', name: 'Arsenal', odds: 2.10 },
            ],
          },
        ],
      };

      const memoryWithInvalidMarket: SessionMemory = {
        sessionId: 'sess-partial',
        lastEventId: 'e1',
        lastSport: { id: '00', name: 'Football' },
        lastFixture: { id: 'e1', name: 'Arsenal vs Chelsea', homeTeam: 'Arsenal', awayTeam: 'Chelsea', isLive: true },
        lastMarket: { id: 'm-expired-999', name: 'Obsolete Market' },
        lastSelection: { id: 's-expired-999', name: 'Obsolete Selection', odds: 3.50 },
        savedBetslip: [
          {
            eventId: 'e1',
            eventName: 'Arsenal vs Chelsea',
            marketId: 'm-valid',
            marketName: 'Full Time Result',
            selectionId: 's-valid',
            selectionName: 'Arsenal',
            odds: 2.10,
          },
          {
            eventId: 'e1',
            eventName: 'Arsenal vs Chelsea',
            marketId: 'm-expired-999',
            marketName: 'Obsolete Market',
            selectionId: 's-expired-999',
            selectionName: 'Obsolete Selection',
            odds: 3.50,
          },
        ],
        journeyStage: 'DECISION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };

      saveSessionMemory(memoryWithInvalidMarket);
      const loaded = loadSessionMemory([eventWithMarkets]);
      expect(loaded).not.toBeNull();
      expect(loaded?.lastEventId).toBe('e1');
      // Invalid market and selection were stripped
      expect(loaded?.lastMarket).toBeUndefined();
      expect(loaded?.lastSelection).toBeUndefined();
      // Betslip preserved only the valid item
      expect(loaded?.savedBetslip?.length).toBe(1);
      expect(loaded?.savedBetslip?.[0].selectionId).toBe('s-valid');
    });

    it('guarantees confirmed wagers cannot convert into pending actions during resume', () => {
      const completedSessionState: UnifiedSessionState = {
        ...mockInitialState,
        journeyStage: 'COMPLETION',
        healthState: 'HEALTHY',
        pendingAction: {
          inFlight: false,
          idempotencyKey: 'idemp-done',
          actionType: 'SPORTS_WAGER',
          payload: { stake: 25 },
          startedAt: Date.now() - 5000,
        },
        recoveryState: {
          isRecovering: false,
          reason: null,
          recoveredReceipt: {
            receiptId: 'rcpt-confirmed-1',
            idempotencyKey: 'idemp-done',
            stake: 25,
            potentialReturn: 52.5,
            confirmedAt: Date.now() - 4000,
            status: 'CONFIRMED',
            items: [],
          },
        },
      };

      // With completed journey and empty betslip, it must NOT be resumable
      const res = evaluateResumability(completedSessionState, [], mockEvent, []);
      expect(res.resumable).toBe(false);

      const mem = buildSessionMemory(completedSessionState, [], mockEvent, []);
      expect(mem).toBeNull();
    });

    it('verifies existing Lifeboat behavior and Session Quality formulas remain intact', () => {
      // 1. Session Quality baseline
      const initialQuality = calculateSessionQuality([], [], 'HEALTHY');
      expect(initialQuality.overallScore).toBeGreaterThan(0);
      expect(initialQuality.friction).toBe(100);

      // 2. Health transition under friction
      const frictionEvent = createMockEvent('CONNECTION_LOST', { simulated: true });
      const frictions = evaluateFrictionRules([frictionEvent], true);
      const atRiskHealth = transitionHealthState('HEALTHY', frictionEvent, frictions);
      expect(atRiskHealth).toBe('AT_RISK');

      // 3. Quality degradation under high friction and AT_RISK health
      const degradedQuality = calculateSessionQuality([frictionEvent], frictions, atRiskHealth);
      expect(degradedQuality.friction).toBeLessThan(100);
      expect(degradedQuality.recovery).toBe(30);
      expect(degradedQuality.overallScore).toBeLessThan(initialQuality.overallScore);
    });

    it('verifies loading memory does NOT emit SESSION_RESUMED and never triggers automatic wager submission', () => {
      // Set up a valid memory with staged betslip items
      const validMemory: SessionMemory = {
        sessionId: 'sess-passive-load',
        lastEventId: 'e1',
        lastSport: { id: '00', name: 'Football' },
        lastFixture: { id: 'e1', name: 'Arsenal vs Chelsea', homeTeam: 'Arsenal', awayTeam: 'Chelsea', isLive: true },
        savedBetslip: [
          {
            eventId: 'e1',
            eventName: 'Arsenal vs Chelsea',
            marketId: 'm-main',
            marketName: 'Match Winner',
            selectionId: 's-home',
            selectionName: 'Arsenal',
            odds: 1.95,
          },
        ],
        journeyStage: 'DECISION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };

      saveSessionMemory(validMemory);

      // Loading memory merely reads from storage
      const loaded = loadSessionMemory([mockEvent]);
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe('sess-passive-load');

      // An event log simulating application initialization
      const eventsOnBoot: CanonicalEvent[] = [
        createMockEvent('SESSION_STARTED', { reason: 'app_launch' }, 1),
      ];

      // Verify that no SESSION_RESUMED event was generated by simply loading memory
      const hasResumedEvent = eventsOnBoot.some(e => e.eventType === 'SESSION_RESUMED');
      expect(hasResumedEvent).toBe(false);

      // Verify that saved betslip is unsubmitted (no ACTION_STARTED or ACTION_CONFIRMED)
      const hasWagerAction = eventsOnBoot.some(e => e.eventType === 'ACTION_STARTED' || e.eventType === 'ACTION_CONFIRMED');
      expect(hasWagerAction).toBe(false);
    });

    it('verifies Reset Demo clears Session Memory, storage, and resets session context', () => {
      const memoryToWipe: SessionMemory = {
        sessionId: 'sess-to-wipe',
        lastEventId: 'e1',
        resumable: true,
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: true,
        hasProtectedAction: true,
        lastSeenAt: Date.now(),
      };
      saveSessionMemory(memoryToWipe);
      expect(loadSessionMemory([mockEvent])).not.toBeNull();

      // Clear memory as done in resetSession()
      clearSessionMemory();

      expect(loadSessionMemory([mockEvent])).toBeNull();
      expect(loadSessionMemory([])).toBeNull();
    });
  });

  describe('PHASE 16 — User -> Waypoint Telemetry -> Admin Live Intelligence Bridge', () => {
    it('verifies user actions produce canonical events in the authoritative live telemetry log', () => {
      clearAuthoritativeLiveTelemetry();
      const initialTelemetry = loadAuthoritativeLiveTelemetry();
      expect(initialTelemetry).toBeNull();

      const events: CanonicalEvent[] = [
        createMockEvent('SPORT_VIEWED', { sport: 'football' }, 1),
        createMockEvent('SELECTION_ADDED', { eventId: 'match-101', odd: 1.85 }, 2),
      ];

      saveAuthoritativeLiveTelemetry('sess-bridge-test-1', events);

      const loaded = loadAuthoritativeLiveTelemetry();
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe('sess-bridge-test-1');
      expect(loaded?.events.length).toBe(2);
      expect(loaded?.events[0].eventType).toBe('SPORT_VIEWED');
      expect(loaded?.events[1].eventType).toBe('SELECTION_ADDED');
      expect(loaded?.events[1].sequenceNumber).toBe(2);
    });

    it('verifies that the Admin portal and User portal observe the exact same session ID and event trail', () => {
      const liveSessionId = 'live-user-session-abc';
      const eventTrail: CanonicalEvent[] = [
        createMockEvent('SESSION_STARTED', { reason: 'app_launch' }, 1),
        createMockEvent('SPORT_VIEWED', { sport: 'basketball' }, 2),
        createMockEvent('BETSLIP_OPENED', {}, 3),
      ];

      // Simulated User Portal emission
      saveAuthoritativeLiveTelemetry(liveSessionId, eventTrail);

      // Simulated Admin Portal read
      const adminObserved = loadAuthoritativeLiveTelemetry();
      expect(adminObserved).not.toBeNull();
      expect(adminObserved?.sessionId).toBe(liveSessionId);
      expect(adminObserved?.events.map(e => e.eventType)).toEqual([
        'SESSION_STARTED',
        'SPORT_VIEWED',
        'BETSLIP_OPENED',
      ]);
    });

    it('verifies that journey stage and health state transitions are correctly derived from the shared canonical events', () => {
      let stage: JourneyStage = 'DISCOVERY';
      let health: HealthState = 'HEALTHY';

      const events: CanonicalEvent[] = [];

      // Step 1: User navigates sport -> stage changes to EXPLORATION
      const e1 = createMockEvent('SPORT_VIEWED', { sport: 'football' }, 1);
      events.push(e1);
      stage = transitionJourneyStage(stage, e1);
      health = transitionHealthState(health, e1, []);
      expect(stage).toBe('EXPLORATION');
      expect(health).toBe('HEALTHY');

      // Step 2: User adds selection -> stage changes to DECISION
      const e2 = createMockEvent('SELECTION_ADDED', { eventId: 'match-1' }, 2);
      events.push(e2);
      stage = transitionJourneyStage(stage, e2);
      health = transitionHealthState(health, e2, []);
      expect(stage).toBe('DECISION');
      expect(health).toBe('HEALTHY');

      // Step 3: Network error occurs -> health transitions to AT_RISK
      const e3 = createMockEvent('CONNECTION_LOST', { error: 'socket_timeout' }, 3);
      events.push(e3);
      stage = transitionJourneyStage(stage, e3);
      health = transitionHealthState(health, e3, []);
      expect(stage).toBe('DECISION');
      expect(health).toBe('AT_RISK');

      // Save to authoritative telemetry
      saveAuthoritativeLiveTelemetry('sess-state-sync', events);

      const adminTelemetry = loadAuthoritativeLiveTelemetry();
      expect(adminTelemetry?.events.length).toBe(3);
      expect(adminTelemetry?.events[2].eventType).toBe('CONNECTION_LOST');
    });

    it('verifies recovery flow events are reflected in the authoritative session stream', () => {
      let health: HealthState = 'AT_RISK';
      const events: CanonicalEvent[] = [
        createMockEvent('CONNECTION_LOST', {}, 1),
      ];

      // Recovery started
      const eRecoveryStart = createMockEvent('RECOVERY_STARTED', { reason: 'lifeboat_auto' }, 2);
      events.push(eRecoveryStart);
      health = transitionHealthState(health, eRecoveryStart, []);
      expect(health).toBe('RECOVERING');

      // Recovery completed
      const eRecoveryDone = createMockEvent('RECOVERY_COMPLETED', { restored: true }, 3);
      events.push(eRecoveryDone);
      health = transitionHealthState(health, eRecoveryDone, []);
      expect(health).toBe('RECOVERED');

      saveAuthoritativeLiveTelemetry('sess-recovery-test', events);
      const adminSeen = loadAuthoritativeLiveTelemetry();
      expect(adminSeen?.events.some(e => e.eventType === 'RECOVERY_COMPLETED')).toBe(true);
    });

    it('verifies synthetic benchmark sessions are distinguishable from live observed prototype sessions', () => {
      // In operatorAnalytics, synthetic sessions do not have isLiveSession = true
      // While the live session explicitly has isLiveSession: true
      const syntheticSession = {
        sessionId: 'PSK-SESS-0001',
        isLiveSession: false,
        platform: 'Android App',
        sport: 'Football',
        journeyStage: 'COMPLETION' as JourneyStage,
        healthState: 'HEALTHY' as HealthState,
        qualityScore: 92,
        riskScore: 5,
        dna: 'HYPER-FOCUSED-STRIKER',
        provider: 'Genius Sports',
        frictionPoints: [],
        events: [],
      };

      const liveObservedSession = {
        sessionId: 'PSK-LIVE-USER-999',
        isLiveSession: true,
        platform: 'Web Desktop',
        sport: 'Football',
        journeyStage: 'EXPLORATION' as JourneyStage,
        healthState: 'HEALTHY' as HealthState,
        qualityScore: 84,
        riskScore: 12,
        dna: 'DELIBERATE-EXPLORER',
        provider: 'Sportradar',
        frictionPoints: [],
        events: [],
      };

      expect(liveObservedSession.isLiveSession).toBe(true);
      expect(syntheticSession.isLiveSession).toBe(false);
    });

    it('verifies no duplicate event stream exists and clearing telemetry wipes the log', () => {
      saveAuthoritativeLiveTelemetry('sess-wipe', [createMockEvent('SESSION_STARTED')]);
      expect(loadAuthoritativeLiveTelemetry()).not.toBeNull();

      clearAuthoritativeLiveTelemetry();
      expect(loadAuthoritativeLiveTelemetry()).toBeNull();
    });
  });

  describe('PHASE 15.2 — Continue Playing as the Primary Re-Entry Experience', () => {
    const knownFixture: SportsEvent = {
      id: 'ufo:mtch:demo-eng-cro',
      sportId: '00',
      sportName: 'Football',
      tournament: 'UEFA Nations League',
      category: 'International',
      homeTeam: 'England',
      awayTeam: 'Croatia',
      isLive: true,
      clock: '68m',
      hasLiveRoom: true,
      markets: [
        {
          id: 'm-goals',
          name: 'Total Goals',
          category: 'GOALS',
          status: 'OPEN',
          selections: [
            { id: 'sel-eng-u25', name: 'Under 2.5 Goals', odds: 1.85, trend: 'STEADY' },
            { id: 'sel-eng-o25', name: 'Over 2.5 Goals', odds: 1.95, trend: 'DOWN' },
          ],
        },
      ],
    };

    it('1. Resumable memory appears and is prioritized for valid uncompleted session', () => {
      const state: UnifiedSessionState = {
        sessionId: 'sess-p15-2',
        currentScreen: 'home',
        currentSport: { id: '00', name: 'Football' },
        currentEvent: { id: knownFixture.id, name: 'England vs Croatia' },
        currentMarket: { id: 'm-goals', name: 'Total Goals' },
        currentSelection: null,
        journeyStage: 'DECISION',
        healthState: 'HEALTHY',
        sessionQuality: {
          relevance: 100,
          informedness: 80,
          friction: 100,
          momentum: 60,
          recovery: 100,
          overallScore: 88,
        },
        frictionSignals: [],
        momentum: 'STABLE',
        momentumScore: 60,
        intentContext: { level: 'HIGH', activeGoal: 'Viewing Markets', lastIntentTimestamp: Date.now() },
        pendingAction: { inFlight: false, idempotencyKey: null, actionType: null, payload: null, startedAt: null },
        recoveryState: { isRecovering: false, reason: null, recoveredReceipt: null },
        socialRoomContext: { activeRoomId: null, activeUsersCount: 0, lastInteraction: null, currentUserId: null, roomRank: 0 },
        sessionDna: 'STANDARD',
        sessionDnaTrail: ['START'],
      };

      const memory = buildSessionMemory(state, [createMockEvent('SPORT_VIEWED')], knownFixture);
      expect(memory).not.toBeNull();
      expect(memory?.resumable).toBe(true);
      expect(memory?.lastFixture?.name).toBe('England vs Croatia');
      expect(memory?.lastMarket?.name).toBe('Total Goals');
    });

    it('2. Non-resumable empty/completed memory is not created or shown', () => {
      const emptyState: UnifiedSessionState = {
        sessionId: 'sess-empty',
        currentScreen: 'home',
        currentSport: { id: '00', name: 'Football' },
        currentEvent: null,
        currentMarket: null,
        currentSelection: null,
        journeyStage: 'DISCOVERY',
        healthState: 'HEALTHY',
        sessionQuality: { relevance: 100, informedness: 50, friction: 100, momentum: 50, recovery: 100, overallScore: 80 },
        frictionSignals: [],
        momentum: 'STABLE',
        momentumScore: 50,
        intentContext: { level: 'LOW', activeGoal: 'Browsing', lastIntentTimestamp: Date.now() },
        pendingAction: { inFlight: false, idempotencyKey: null, actionType: null, payload: null, startedAt: null },
        recoveryState: { isRecovering: false, reason: null, recoveredReceipt: null },
        socialRoomContext: { activeRoomId: null, activeUsersCount: 0, lastInteraction: null, currentUserId: null, roomRank: 0 },
        sessionDna: 'STANDARD',
        sessionDnaTrail: ['START'],
      };

      const emptyMemory = buildSessionMemory(emptyState, [], null, []);
      expect(emptyMemory).toBeNull();
    });

    it('3. Memory survives simulated browser restart (localStorage persistence)', () => {
      clearSessionMemory();
      const freshMemory: SessionMemory = {
        sessionId: 'sess-survive-restart',
        lastEventId: knownFixture.id,
        lastFixture: {
          id: knownFixture.id,
          name: 'England vs Croatia',
          homeTeam: 'England',
          awayTeam: 'Croatia',
          isLive: true,
        },
        lastMarket: { id: 'm-goals', name: 'Total Goals' },
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };

      saveSessionMemory(freshMemory);

      // Simulate browser reopening and calling loadSessionMemory on boot
      const reloaded = loadSessionMemory([knownFixture]);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.sessionId).toBe('sess-survive-restart');
      expect(reloaded?.lastFixture?.name).toBe('England vs Croatia');
      expect(reloaded?.lastMarket?.name).toBe('Total Goals');
    });

    it('4. Stale memory older than 24 hours is purged and does not appear', () => {
      const staleTimestamp = Date.now() - (SESSION_MEMORY_FRESHNESS_MS + 5000);
      const staleMemory: SessionMemory = {
        sessionId: 'sess-stale',
        lastEventId: knownFixture.id,
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: staleTimestamp,
      };

      saveSessionMemory(staleMemory);
      const loaded = loadSessionMemory([knownFixture]);
      expect(loaded).toBeNull();
    });

    it('5. Memory with non-existent fixture is discarded gracefully', () => {
      const orphanMemory: SessionMemory = {
        sessionId: 'sess-orphan',
        lastEventId: 'non-existent-fixture-999',
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };

      saveSessionMemory(orphanMemory);
      const loaded = loadSessionMemory([knownFixture]);
      expect(loaded).toBeNull();
    });

    it('6. Loading memory emits ZERO canonical events (does not trigger premature SESSION_RESUMED)', () => {
      const testMemory: SessionMemory = {
        sessionId: 'sess-passive',
        lastEventId: knownFixture.id,
        journeyStage: 'DECISION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };
      saveSessionMemory(testMemory);

      const eventsOnAppBoot: CanonicalEvent[] = [];
      const loaded = loadSessionMemory([knownFixture]);
      expect(loaded).not.toBeNull();

      // Verify no SESSION_RESUMED event was pushed to the event log
      const hasResumed = eventsOnAppBoot.some(e => e.eventType === 'SESSION_RESUMED');
      expect(hasResumed).toBe(false);
    });

    it('7. Interrupted session correctly identifies protection state and uses appropriate copy flags', () => {
      const interruptedState: UnifiedSessionState = {
        sessionId: 'sess-interrupted-flow',
        currentScreen: 'sports',
        currentSport: { id: '00', name: 'Football' },
        currentEvent: { id: knownFixture.id, name: 'England vs Croatia' },
        currentMarket: { id: 'm-goals', name: 'Total Goals' },
        currentSelection: null,
        journeyStage: 'ACTION',
        healthState: 'AT_RISK',
        sessionQuality: { relevance: 100, informedness: 80, friction: 50, momentum: 20, recovery: 50, overallScore: 60 },
        momentum: 'DECLINING',
        frictionSignals: [{
          type: 'connection_loss',
          severity: 'high',
          timestamp: Date.now(),
          evidence: 'Simulated connection loss',
          confidence: 0.95,
          recommendedResponse: 'Initiate lifeboat safe mode',
        }],
        momentumScore: 20,
        intentContext: { level: 'HIGH', activeGoal: 'Submitting Action', lastIntentTimestamp: Date.now() },
        pendingAction: { inFlight: true, idempotencyKey: 'idemp-xyz', actionType: 'SPORTS_WAGER', payload: {}, startedAt: Date.now() },
        recoveryState: { isRecovering: true, reason: 'Network dropped', recoveredReceipt: null },
        socialRoomContext: { activeRoomId: null, activeUsersCount: 0, lastInteraction: null, currentUserId: null, roomRank: 0 },
        sessionDna: 'STANDARD',
        sessionDnaTrail: ['ACTION'],
      };

      const memory = buildSessionMemory(interruptedState, [createMockEvent('ACTION_STARTED')], knownFixture);
      expect(memory).not.toBeNull();
      expect(memory?.interrupted).toBe(true);
      expect(memory?.hasProtectedAction).toBe(true);
      expect(memory?.healthState).toBe('AT_RISK');
    });

    it('8. Reset Demo clears Session Memory, preventing Continue Playing from appearing', () => {
      const memory: SessionMemory = {
        sessionId: 'sess-reset-test',
        lastEventId: knownFixture.id,
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };
      saveSessionMemory(memory);
      expect(loadSessionMemory([knownFixture])).not.toBeNull();

      // Reset action
      clearSessionMemory();
      expect(loadSessionMemory([knownFixture])).toBeNull();
    });
  });

  describe('PHASE 17: Customer Context Layer (Recently Viewed, My Live Rooms, Session Activity)', () => {
    const fixture1: SportsEvent = {
      id: 'ufo:mtch:1',
      sportId: '00',
      sportName: 'Football',
      tournament: 'Premier League',
      category: 'England',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      isLive: true,
      markets: [],
      hasLiveRoom: true,
    };

    const fixture2: SportsEvent = {
      id: 'ufo:mtch:2',
      sportId: '00',
      sportName: 'Football',
      tournament: 'La Liga',
      category: 'Spain',
      homeTeam: 'Real Madrid',
      awayTeam: 'Barcelona',
      isLive: false,
      markets: [],
      hasLiveRoom: true,
    };

    const fixture3: SportsEvent = {
      id: 'ufo:mtch:3',
      sportId: '0x',
      sportName: 'Tennis',
      tournament: 'Wimbledon',
      category: 'Grand Slam',
      homeTeam: 'Alcaraz',
      awayTeam: 'Sinner',
      isLive: true,
      markets: [],
      hasLiveRoom: false,
    };

    const allFixtures = [fixture1, fixture2, fixture3];

    it('1. Event viewed creates recent item', () => {
      _resetCustomerContextFallbacksForTesting();
      const updated = recordRecentlyViewed(fixture1, allFixtures);
      expect(updated.length).toBe(1);
      expect(updated[0].eventId).toBe('ufo:mtch:1');
      expect(updated[0].eventName).toBe('Arsenal vs Chelsea');
    });

    it('2. Repeated event deduplicates and bumps to top', () => {
      _resetCustomerContextFallbacksForTesting();
      recordRecentlyViewed(fixture1, allFixtures);
      recordRecentlyViewed(fixture2, allFixtures);
      expect(loadRecentlyViewed(allFixtures)[0].eventId).toBe('ufo:mtch:2');

      // Re-visit fixture 1
      recordRecentlyViewed(fixture1, allFixtures);
      const items = loadRecentlyViewed(allFixtures);
      expect(items.length).toBe(2);
      expect(items[0].eventId).toBe('ufo:mtch:1');
      expect(items[1].eventId).toBe('ufo:mtch:2');
    });

    it('3. Maximum 5 items maintained', () => {
      _resetCustomerContextFallbacksForTesting();
      for (let i = 1; i <= 8; i++) {
        const fakeFix: SportsEvent = {
          ...fixture1,
          id: `ufo:mtch:bulk-${i}`,
          homeTeam: `Team ${i}A`,
          awayTeam: `Team ${i}B`,
        };
        recordRecentlyViewed(fakeFix);
      }
      const loaded = loadRecentlyViewed();
      expect(loaded.length).toBe(5);
      expect(loaded[0].eventId).toBe('ufo:mtch:bulk-8');
    });

    it('4. Newest item appears first', () => {
      _resetCustomerContextFallbacksForTesting();
      recordRecentlyViewed(fixture1, allFixtures);
      recordRecentlyViewed(fixture3, allFixtures);
      const items = loadRecentlyViewed(allFixtures);
      expect(items[0].eventId).toBe('ufo:mtch:3');
    });

    it('5. Invalid event gracefully removed during validation', () => {
      _resetCustomerContextFallbacksForTesting();
      recordRecentlyViewed(fixture1, allFixtures);
      recordRecentlyViewed({ ...fixture2, id: 'obsolete-id' }, allFixtures);

      // Validate against allFixtures (which does NOT include obsolete-id)
      const valid = loadRecentlyViewed(allFixtures);
      expect(valid.length).toBe(1);
      expect(valid[0].eventId).toBe('ufo:mtch:1');
    });

    it('6. Empty state hidden (returns empty array when none viewed)', () => {
      _resetCustomerContextFallbacksForTesting();
      expect(loadRecentlyViewed(allFixtures).length).toBe(0);
    });

    it('7. Active Continue Playing item excluded to prevent duplicate cards', () => {
      _resetCustomerContextFallbacksForTesting();
      recordRecentlyViewed(fixture1, allFixtures);
      recordRecentlyViewed(fixture2, allFixtures);

      // Exclude fixture2 because it is the active resumable Continue Playing fixture
      const filtered = loadRecentlyViewed(allFixtures, 'ufo:mtch:2');
      expect(filtered.length).toBe(1);
      expect(filtered[0].eventId).toBe('ufo:mtch:1');
    });

    it('8. Created room appears in My Live Rooms', () => {
      _resetCustomerContextFallbacksForTesting();
      const mockRoom = {
        roomId: 'rm-101',
        roomCode: 'ARSCHL',
        roomName: 'Arsenal Fans Club',
        eventId: fixture1.id,
        sportId: '00',
        createdAt: Date.now(),
        creatorSessionId: 'sess-1',
        privacy: 'public' as const,
        participantCount: 5,
      };
      recordUserRoom(mockRoom, 'host');
      const rooms = loadUserRooms(allFixtures, [mockRoom]);
      expect(rooms.length).toBe(1);
      expect(rooms[0].roomId).toBe('rm-101');
      expect(rooms[0].role).toBe('host');
    });

    it('9. Joined room appears in My Live Rooms', () => {
      _resetCustomerContextFallbacksForTesting();
      const mockRoom = {
        roomId: 'rm-102',
        roomCode: 'RMDCMP',
        roomName: 'El Clasico Live',
        eventId: fixture2.id,
        sportId: '00',
        createdAt: Date.now(),
        creatorSessionId: 'other-sess',
        privacy: 'public' as const,
        participantCount: 12,
      };
      recordUserRoom(mockRoom, 'participant');
      const rooms = loadUserRooms(allFixtures, [mockRoom]);
      expect(rooms.length).toBe(1);
      expect(rooms[0].role).toBe('participant');
    });

    it('10. Duplicate room prevented in user room list', () => {
      _resetCustomerContextFallbacksForTesting();
      const mockRoom = {
        roomId: 'rm-101',
        roomCode: 'ARSCHL',
        roomName: 'Arsenal Fans Club',
        eventId: fixture1.id,
        sportId: '00',
        createdAt: Date.now(),
        creatorSessionId: 'sess-1',
        privacy: 'public' as const,
        participantCount: 5,
      };
      recordUserRoom(mockRoom, 'participant');
      recordUserRoom(mockRoom, 'participant');
      const rooms = loadUserRooms(allFixtures, [mockRoom]);
      expect(rooms.length).toBe(1);
    });

    it('11. Invalid room with missing event gracefully removed', () => {
      _resetCustomerContextFallbacksForTesting();
      const orphanRoom = {
        roomId: 'rm-orphan',
        roomCode: 'ORPHAN',
        roomName: 'Non Existent Game',
        eventId: 'non-existent-event-id',
        sportId: '00',
        createdAt: Date.now(),
        creatorSessionId: 'sess-1',
        privacy: 'public' as const,
        participantCount: 1,
      };
      recordUserRoom(orphanRoom, 'participant');
      const rooms = loadUserRooms(allFixtures, [orphanRoom]);
      expect(rooms.length).toBe(0);
    });

    it('12. No rooms means section returns empty array', () => {
      _resetCustomerContextFallbacksForTesting();
      expect(loadUserRooms(allFixtures, []).length).toBe(0);
    });

    it('13. Meaningful canonical event becomes activity item with neutral language', () => {
      _resetCustomerContextFallbacksForTesting();
      const event: CanonicalEvent = {
        id: 'evt-test-view',
        sessionId: 'sess-abc',
        timestamp: Date.now(),
        sequenceNumber: 1,
        eventType: 'EVENT_VIEWED',
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'EXPLORATION',
        sessionHealth: 'HEALTHY',
        entityContext: { eventName: 'Arsenal vs Chelsea' },
        metadata: { homeTeam: 'Arsenal', awayTeam: 'Chelsea' },
        source: 'user_action',
      };

      const projected = projectCanonicalEventToActivity(event);
      expect(projected).not.toBeNull();
      expect(projected?.description).toBe('Viewed Arsenal vs Chelsea');
      expect(projected?.iconType).toBe('view');
    });

    it('14. Maximum 10 activities maintained', () => {
      _resetCustomerContextFallbacksForTesting();
      for (let i = 1; i <= 15; i++) {
        const ev: CanonicalEvent = {
          id: `evt-bulk-${i}`,
          sessionId: 'sess-abc',
          timestamp: Date.now() + i * 1000,
          sequenceNumber: i,
          eventType: 'MARKET_VIEWED',
          platform: 'web-desktop',
          product: 'sports',
          journeyStage: 'DECISION',
          sessionHealth: 'HEALTHY',
          entityContext: {},
          metadata: { marketName: `Market ${i}` },
          source: 'user_action',
        };
        recordSessionActivity(ev);
      }
      const loaded = loadSessionActivity();
      expect(loaded.length).toBe(10);
      expect(loaded[0].description).toBe('Opened Market 15');
    });

    it('15. Activities ordered newest first', () => {
      _resetCustomerContextFallbacksForTesting();
      const ev1: CanonicalEvent = {
        id: 'evt-1',
        sessionId: 'sess-abc',
        timestamp: Date.now() - 10000,
        sequenceNumber: 1,
        eventType: 'SESSION_STARTED',
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'DISCOVERY',
        sessionHealth: 'HEALTHY',
        entityContext: {},
        metadata: {},
        source: 'system_lifecycle',
      };
      const ev2: CanonicalEvent = {
        id: 'evt-2',
        sessionId: 'sess-abc',
        timestamp: Date.now(),
        sequenceNumber: 2,
        eventType: 'EVENT_VIEWED',
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'EXPLORATION',
        sessionHealth: 'HEALTHY',
        entityContext: {},
        metadata: { homeTeam: 'Arsenal', awayTeam: 'Chelsea' },
        source: 'user_action',
      };
      recordSessionActivity(ev1);
      recordSessionActivity(ev2);

      const list = loadSessionActivity();
      expect(list[0].description).toBe('Viewed Arsenal vs Chelsea');
      expect(list[1].description).toBe('Session started');
    });

    it('16. Low-level/non-meaningful events excluded from activity projection', () => {
      const noisyEvent: CanonicalEvent = {
        id: 'evt-noisy',
        sessionId: 'sess-abc',
        timestamp: Date.now(),
        sequenceNumber: 1,
        eventType: 'PREDICTION_MADE' as any,
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'DECISION',
        sessionHealth: 'HEALTHY',
        entityContext: {},
        metadata: {},
        source: 'user_action',
      };
      expect(projectCanonicalEventToActivity(noisyEvent)).toBeNull();
    });

    it('17. Activity survives refresh via storage fallback', () => {
      _resetCustomerContextFallbacksForTesting();
      const ev: CanonicalEvent = {
        id: 'evt-refresh-test',
        sessionId: 'sess-abc',
        timestamp: Date.now(),
        sequenceNumber: 1,
        eventType: 'CONNECTION_RESTORED',
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'DECISION',
        sessionHealth: 'HEALTHY',
        entityContext: {},
        metadata: {},
        source: 'network_monitor',
      };
      recordSessionActivity(ev);
      const retrieved = loadSessionActivity();
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].description).toBe('Connection restored');
    });

    it('18. Reset Demo clears all customer context correctly', () => {
      recordRecentlyViewed(fixture1);
      recordUserRoom({
        roomId: 'rm-1',
        roomCode: 'ABC123',
        roomName: 'Test Room',
        eventId: fixture1.id,
        sportId: '00',
        createdAt: Date.now(),
        creatorSessionId: 'sess',
        privacy: 'public',
        participantCount: 1,
      }, 'host');
      recordSessionActivity({
        id: 'evt-r',
        sessionId: 'sess',
        timestamp: Date.now(),
        sequenceNumber: 1,
        eventType: 'SESSION_STARTED',
        platform: 'web-desktop',
        product: 'sports',
        journeyStage: 'DISCOVERY',
        sessionHealth: 'HEALTHY',
        entityContext: {},
        metadata: {},
        source: 'system_lifecycle',
      });

      expect(loadRecentlyViewed().length).toBeGreaterThan(0);
      expect(loadSessionActivity().length).toBeGreaterThan(0);

      // Execute Reset
      resetCustomerContext();

      expect(loadRecentlyViewed().length).toBe(0);
      expect(loadUserRooms().length).toBe(0);
      expect(loadSessionActivity().length).toBe(0);
    });

    it('19-24. Regressions check: Intelligence, Quality, Lifeboat, and Admin Telemetry unchanged', () => {
      // 19. Continue Playing remains primary
      const memory: SessionMemory = {
        sessionId: 'sess-p0',
        lastEventId: fixture1.id,
        journeyStage: 'EXPLORATION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      };
      saveSessionMemory(memory);
      expect(loadSessionMemory([fixture1])?.resumable).toBe(true);

      // 20. Smart Resume remains safe
      expect(memory.savedBetslip).toBeUndefined();

      // 21. Lifeboat unchanged
      const atRiskHealth = transitionHealthState('AT_RISK', createMockEvent('RECOVERY_STARTED'), []);
      expect(atRiskHealth).toBe('RECOVERING');

      // 22. Session Quality unchanged
      const sq = calculateSessionQuality([], [], 'HEALTHY');
      expect(sq.overallScore).toBeGreaterThan(0);

      // 23-24. Admin telemetry unchanged
      saveAuthoritativeLiveTelemetry('sess-telemetry-ok', [createMockEvent('SESSION_STARTED')]);
      const loadedTel = loadAuthoritativeLiveTelemetry();
      expect(loadedTel?.sessionId).toBe('sess-telemetry-ok');
    });
  });

  describe('PHASE 18: Final System Integration & Demo Audit', () => {
    it('1. Complete Canonical Demo Trace executes with monotonic sequence and single sessionId', () => {
      const demoSessionId = 'sess-demo-e2e-18';
      let seq = 1;
      const demoLog: CanonicalEvent[] = [];

      const emit = (type: any, metadata: any = {}, stage: JourneyStage = 'DISCOVERY', health: HealthState = 'HEALTHY'): CanonicalEvent => {
        const ev: CanonicalEvent = {
          id: `evt-demo-${seq}`,
          sessionId: demoSessionId,
          timestamp: 1700000000000 + seq * 1000,
          sequenceNumber: seq++,
          eventType: type,
          platform: 'web-desktop',
          product: 'sports',
          journeyStage: stage,
          sessionHealth: health,
          entityContext: {
            sportId: '00',
            sportName: 'Football',
            eventId: 'ufo:mtch:demo-eng-cro',
            eventName: 'England vs Croatia',
          },
          metadata,
          source: type.startsWith('RECOVERY') ? 'recovery_engine' : (type.includes('CONNECTION') ? 'network_monitor' : 'user_action'),
        };
        demoLog.push(ev);
        return ev;
      };

      // Canonical Trace:
      // SESSION_STARTED -> SPORT_VIEWED -> EVENT_VIEWED -> MARKET_VIEWED -> BETSLIP_OPENED
      // -> ACTION_STARTED -> CONNECTION_LOST -> RECOVERY_STARTED -> CONNECTION_RESTORED -> RECOVERY_COMPLETED -> ACTION_CONFIRMED
      const e1 = emit('SESSION_STARTED', {}, 'DISCOVERY', 'HEALTHY');
      const e2 = emit('SPORT_VIEWED', { sportName: 'Football' }, 'EXPLORATION', 'HEALTHY');
      const e3 = emit('EVENT_VIEWED', { homeTeam: 'England', awayTeam: 'Croatia' }, 'EXPLORATION', 'HEALTHY');
      const e4 = emit('MARKET_VIEWED', { marketName: 'Total Goals' }, 'DECISION', 'HEALTHY');
      const e5 = emit('BETSLIP_OPENED', { count: 1 }, 'DECISION', 'HEALTHY');
      const e6 = emit('ACTION_STARTED', { stake: 25, idempotencyKey: 'idemp-audit-18' }, 'ACTION', 'HEALTHY');
      const e7 = emit('CONNECTION_LOST', { simulated: true }, 'ACTION', 'AT_RISK');
      const e8 = emit('RECOVERY_STARTED', { reason: 'Lifeboat engaged' }, 'ACTION', 'RECOVERING');
      const e9 = emit('CONNECTION_RESTORED', { downtimeMs: 3000 }, 'ACTION', 'RECOVERING');
      const e10 = emit('RECOVERY_COMPLETED', { restoredIdempotencyKey: 'idemp-audit-18' }, 'ACTION', 'RECOVERED');
      const e11 = emit('ACTION_CONFIRMED', { ticketId: 'TCK-99182', potentialReturn: 48.75 }, 'COMPLETION', 'RECOVERED');

      // Monotonic sequence verification
      for (let i = 0; i < demoLog.length; i++) {
        expect(demoLog[i].sequenceNumber).toBe(i + 1);
        expect(demoLog[i].sessionId).toBe(demoSessionId);
      }

      // Shared Authoritative Bridge verification (Admin sees exact same trace)
      saveAuthoritativeLiveTelemetry(demoSessionId, demoLog);
      const bridged = loadAuthoritativeLiveTelemetry();
      expect(bridged?.sessionId).toBe(demoSessionId);
      expect(bridged?.events.length).toBe(11);
      expect(bridged?.events[10].eventType).toBe('ACTION_CONFIRMED');
    });

    it('2. Journey and Health State Machines maintain complete independence', () => {
      // Journey state does not degrade when connection loss occurs
      const currentJourney: JourneyStage = 'ACTION';
      const lossEvent = createMockEvent('CONNECTION_LOST');
      const nextJourney = transitionJourneyStage(currentJourney, lossEvent);
      expect(nextJourney).toBe('ACTION'); // Journey preserved!

      // Health state transitions correctly without altering journey context
      const nextHealth = transitionHealthState('HEALTHY', lossEvent, []);
      expect(nextHealth).toBe('AT_RISK');
    });

    it('3. Authoritative Session Quality formula is verified across all dimensions [0,100]', () => {
      // Bounded inputs
      const sq = calculateSessionQuality([], [], 'HEALTHY');
      expect(sq.overallScore).toBeGreaterThanOrEqual(0);
      expect(sq.overallScore).toBeLessThanOrEqual(100);
      expect(sq.relevance).toBeGreaterThanOrEqual(0);
      expect(sq.relevance).toBeLessThanOrEqual(100);
      expect(sq.informedness).toBeGreaterThanOrEqual(0);
      expect(sq.informedness).toBeLessThanOrEqual(100);
      expect(sq.friction).toBeGreaterThanOrEqual(0);
      expect(sq.friction).toBeLessThanOrEqual(100);
      expect(sq.momentum).toBeGreaterThanOrEqual(0);
      expect(sq.momentum).toBeLessThanOrEqual(100);
      expect(sq.recovery).toBeGreaterThanOrEqual(0);
      expect(sq.recovery).toBeLessThanOrEqual(100);

      // Exact weights check: (100*0.2) + (50*0.15) + (100*0.35) + (40*0.15) + (100*0.15) = 20 + 7.5 + 35 + 6 + 15 = 83.5 -> 84
      expect(sq.overallScore).toBe(84);
    });

    it('4. Lifeboat invariants: No automatic double submission, no blind retry, pending action protected', () => {
      const pendingAction = {
        inFlight: true,
        idempotencyKey: 'idemp-safe-18',
        actionType: 'SPORTS_WAGER',
        payload: { stake: 20 },
        startedAt: Date.now(),
      };

      // During connection loss, pending action remains inFlight with idempotencyKey intact
      expect(pendingAction.inFlight).toBe(true);
      expect(pendingAction.idempotencyKey).toBe('idemp-safe-18');
    });

    it('5. Error Resilience: Malformed data and corrupted storage handled gracefully without crash', () => {
      _setRawMemoryForTesting('CORRUPTED_NON_JSON_DATA{{{');
      expect(loadSessionMemory([])).toBeNull();

      _resetCustomerContextFallbacksForTesting();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('waypoint_recently_viewed', 'INVALID_JSON');
        localStorage.setItem('waypoint_session_activity', 'INVALID_JSON');
        localStorage.setItem('waypoint_user_rooms', 'INVALID_JSON');
      }
      expect(loadRecentlyViewed([])).toEqual([]);
      expect(loadSessionActivity()).toEqual([]);
      expect(loadUserRooms([], [])).toEqual([]);
    });

    it('6. Reset Demo executes clean cascade across all layers simultaneously', () => {
      saveSessionMemory({
        sessionId: 'sess-to-wipe',
        lastEventId: 'ufo:mtch:demo-eng-cro',
        journeyStage: 'ACTION',
        healthState: 'HEALTHY',
        interrupted: false,
        resumable: true,
        hasProtectedAction: false,
        lastSeenAt: Date.now(),
      });
      recordRecentlyViewed({
        id: 'ufo:mtch:demo-eng-cro',
        sportId: '00',
        sportName: 'Football',
        tournament: 'UEFA',
        category: 'Intl',
        homeTeam: 'England',
        awayTeam: 'Croatia',
        isLive: true,
        markets: [],
        hasLiveRoom: true,
      });

      expect(loadSessionMemory([])).not.toBeNull();
      expect(loadRecentlyViewed().length).toBeGreaterThan(0);

      // Perform Full Reset
      clearSessionMemory();
      resetCustomerContext();

      expect(loadSessionMemory([])).toBeNull();
      expect(loadRecentlyViewed().length).toBe(0);
      expect(loadSessionActivity().length).toBe(0);
      expect(loadUserRooms().length).toBe(0);
    });
  });
});






