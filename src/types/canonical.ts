// CANONICAL TELEMETRY AND UNIFIED SESSION STATE DEFINITIONS

export type CanonicalEventType =
  | 'SESSION_STARTED'
  | 'SCREEN_VIEWED'
  | 'SPORT_VIEWED'
  | 'EVENT_VIEWED'
  | 'MARKET_VIEWED'
  | 'SELECTION_VIEWED'
  | 'SELECTION_ADDED'
  | 'BETSLIP_OPENED'
  | 'ACTION_STARTED'
  | 'ACTION_CONFIRMED'
  | 'ACTION_FAILED'
  | 'GAME_LAUNCH_STARTED'
  | 'GAME_LAUNCH_SUCCESS'
  | 'GAME_LAUNCH_FAILED'
  | 'CONNECTION_LOST'
  | 'CONNECTION_RESTORED'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'ROOM_MESSAGE_SENT'
  | 'ROOM_REACTION'
  | 'ROOM_POLL'
  | 'USER_LOGGED_IN'
  | 'PROFILE_UPDATED'
  | 'ROOM_LEADERBOARD_VIEWED'
  | 'PREDICTION_MADE'
  | 'PREDICTION_RESOLVED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_COMPLETED'
  | 'SESSION_MEMORY_SAVED'
  | 'SESSION_RESUMED'
  | 'NOTIFICATION_GENERATED'
  | 'NOTIFICATION_SHOWN'
  | 'NOTIFICATION_OPENED'
  | 'NOTIFICATION_DISMISSED'
  | 'SESSION_ENDED';

export interface LiveMatchRoom {
  roomId: string;
  roomCode: string;
  roomName: string;
  eventId: string;
  sportId: string;
  createdAt: number;
  creatorSessionId: string;
  privacy: 'friends_with_link' | 'public';
  participantCount: number;
}

export type JourneyStage =
  | 'DISCOVERY'
  | 'EXPLORATION'
  | 'DECISION'
  | 'ACTION'
  | 'COMPLETION';

export type HealthState =
  | 'HEALTHY'
  | 'FRICTION'
  | 'AT_RISK'
  | 'RECOVERING'
  | 'RECOVERED'
  | 'FAILED';

export type MomentumTrend = 'RISING' | 'STABLE' | 'DECLINING';

export type SessionDnaProfile =
  | 'HIGH-INTENT'
  | 'EXPLORER'
  | 'FAST-DECISION'
  | 'SOCIAL'
  | 'RECOVERY'
  | 'FRICTION-HEAVY'
  | 'STANDARD';

export interface CanonicalEvent<T = any> {
  id: string;
  sessionId: string;
  timestamp: number;
  sequenceNumber: number;
  eventType: CanonicalEventType;
  platform: 'web-desktop' | 'web-mobile';
  product: 'sports' | 'live' | 'casino' | 'live-room';
  journeyStage: JourneyStage;
  sessionHealth: HealthState;
  entityContext: {
    sportId?: string;
    sportName?: string;
    tournamentId?: string;
    eventId?: string;
    eventName?: string;
    marketId?: string;
    marketName?: string;
    selectionId?: string;
    selectionName?: string;
    roomId?: string;
  };
  metadata: T;
  source: 'user_action' | 'system_lifecycle' | 'network_monitor' | 'recovery_engine';
}

export interface FrictionSignal {
  type:
    | 'excessive_navigation'
    | 'repeated_back_forth'
    | 'long_loading_time'
    | 'connection_loss'
    | 'repeated_failed_action'
    | 'uncertainty_after_action'
    | 'excessive_market_expansion'
    | 'abandoned_high_intent'
    | 'odds_drift_shock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  timestamp: number;
  confidence: number; // 0.0 - 1.0
  recommendedResponse: string;
}

export interface SessionQualityBreakdown {
  relevance: number;    // 0 - 100: Contextual match of viewed markets
  informedness: number; // 0 - 100: Stats and market depth inspected
  friction: number;     // 0 - 100: Absence of anomalies (100 = 0 friction)
  momentum: number;     // 0 - 100: Progression towards conscious goal
  recovery: number;     // 0 - 100: Resiliency when dropouts happen
  overallScore: number; // Average composite
}

export interface RiskAssessment {
  riskScore: number;    // 0.0 - 1.0
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  evidence: Record<string, any>;
}

export interface UnifiedSessionState {
  sessionId: string;
  currentScreen: 'home' | 'sports' | 'event' | 'room' | 'casino' | 'operator';
  currentSport: { id: string; name: string } | null;
  currentEvent: { id: string; name: string; score?: string } | null;
  currentMarket: { id: string; name: string } | null;
  currentSelection: { id: string; name: string; odds: number } | null;
  
  journeyStage: JourneyStage;
  healthState: HealthState;
  
  sessionQuality: SessionQualityBreakdown;
  frictionSignals: FrictionSignal[];
  momentum: MomentumTrend;
  momentumScore: number;
  intentContext: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    activeGoal: string;
    lastIntentTimestamp: number;
  };
  
  pendingAction: {
    inFlight: boolean;
    idempotencyKey: string | null;
    actionType: string | null;
    payload: any | null;
    startedAt: number | null;
  };
  
  recoveryState: {
    isRecovering: boolean;
    reason: string | null;
    recoveredReceipt: any | null;
  };
  
  socialRoomContext: {
    activeRoomId: string | null;
    activeUsersCount: number;
    lastInteraction: string | null;
    currentUserId?: string | null;
    roomRank?: number | null;
    predictionContext?: string | null;
  };
  
  sessionDna: SessionDnaProfile;
  sessionDnaTrail: string[];
}

export interface Selection {
  id: string;
  name: string;
  odds: number;
  previousOdds?: number;
  trend?: 'UP' | 'DOWN' | 'STEADY';
  isLocked?: boolean;
}

export interface Market {
  id: string;
  name: string;
  category: 'MAIN' | 'GOALS' | 'HALVES' | 'HANDICAP' | 'CARDS';
  status: 'OPEN' | 'SUSPENDED';
  selections: Selection[];
}

export interface SportsEvent {
  id: string;
  sportId: string;
  sportName: string;
  tournament: string;
  category: string;
  homeTeam: string;
  awayTeam: string;
  isLive: boolean;
  score?: { home: number; away: number };
  clock?: string;
  markets: Market[];
  stats?: { attacks: number; dangerousAttacks: number; possession: number };
  hasLiveRoom: boolean;
  activeRoomParticipants?: number;
}

export interface SlipItem {
  eventId: string;
  eventName: string;
  marketId: string;
  marketName: string;
  selectionId: string;
  selectionName: string;
  odds: number;
  previousOdds?: number;
  driftWarning?: boolean;
}

export interface WagerReceipt {
  ticketId: string;
  idempotencyKey: string;
  timestamp: number;
  items: SlipItem[];
  stake: number;
  tax: number;
  bonus: number;
  potentialReturn: number;
  status: 'CONFIRMED' | 'REJECTED';
}

export interface SessionMemory {
  sessionId: string;
  lastEventId?: string;
  lastSport?: { id: string; name: string };
  lastCompetition?: string;
  lastFixture?: {
    id: string;
    name: string;
    homeTeam: string;
    awayTeam: string;
    isLive: boolean;
  };
  lastMarket?: { id: string; name: string };
  lastSelection?: { id: string; name: string; odds: number };
  savedBetslip?: SlipItem[];
  journeyStage: JourneyStage;
  healthState: HealthState;
  interrupted: boolean;
  resumable: boolean;
  interruptionReason?: string;
  hasProtectedAction?: boolean;
  protectedActionPayload?: any;
  roomId?: string;
  lastSeenAt: number;
}
