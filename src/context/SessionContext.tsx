import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  CanonicalEvent,
  CanonicalEventType,
  FrictionSignal,
  HealthState,
  JourneyStage,
  MomentumTrend,
  RiskAssessment,
  SessionDnaProfile,
  SessionQualityBreakdown,
  SlipItem,
  SportsEvent,
  UnifiedSessionState,
  WagerReceipt,
  LiveMatchRoom,
  SessionMemory,
} from '../types/canonical';
import {
  UserProfile,
  UserAchievement,
  RoomParticipant,
  RoomLeaderboardEntry,
  RoomPrediction,
} from '../types/social';
import { INITIAL_EVENTS } from '../services/mockSportsData';
import {
  transitionJourneyStage,
  transitionHealthState,
  evaluateFrictionRules,
  calculateRiskAssessment,
  calculateSessionQuality,
  evaluateMomentum,
  deriveSessionDna,
} from '../services/sessionIntelligence';
import {
  createDefaultUser,
  calculateLoginStreak,
  getInitialRoomParticipants,
  buildRoomLeaderboard,
  calculateSocialScore,
  CATALOG_ACHIEVEMENTS,
  validateUsername,
  findPrototypeAccount,
  savePrototypeAccount,
} from '../services/socialUserService';
import {
  buildSessionMemory,
  saveSessionMemory,
  loadSessionMemory,
  clearSessionMemory,
  saveAuthoritativeLiveTelemetry,
  loadAuthoritativeLiveTelemetry,
  clearAuthoritativeLiveTelemetry,
} from '../services/sessionMemoryService';
import {
  recordRecentlyViewed,
  recordUserRoom,
  recordSessionActivity,
  resetCustomerContext,
} from '../services/customerContextService';
import {
  InAppNotification,
  loadInAppNotifications,
  saveInAppNotifications,
  addInAppNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearInAppNotifications,
  evaluateContextualNotification,
} from '../services/notificationService';

interface SessionContextType {
  state: UnifiedSessionState;
  eventsLog: CanonicalEvent[];
  events: SportsEvent[];
  activeEvent: SportsEvent | null;
  betslip: SlipItem[];
  receipts: WagerReceipt[];
  isBetslipOpen: boolean;
  riskAssessment: RiskAssessment;
  
  // Custom Live Match Rooms
  rooms: LiveMatchRoom[];
  activeCustomRoom: LiveMatchRoom | null;
  createCustomRoom: (name: string, event: SportsEvent, privacy?: 'friends_with_link' | 'public') => LiveMatchRoom;
  joinRoomByCode: (code: string) => { success: boolean; error?: string };
  joinCustomRoom: (room: LiveMatchRoom) => void;

  // Social Identity & User Account (Phase 12)
  user: UserProfile | null;
  loginUser: (username: string, displayName?: string, avatar?: string) => void;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'avatar' | 'bio'>>) => void;
  unlockAchievement: (achievementId: string) => void;
  roomParticipants: RoomParticipant[];
  roomLeaderboard: RoomLeaderboardEntry[];
  roomPredictions: RoomPrediction[];
  makePrediction: (predictionId: string, optionId: string) => void;
  resolvePrediction: (predictionId: string, correctOptionId: string) => void;
  
  // Actions
  emitEvent: (type: CanonicalEventType, metadata?: any, entityContext?: any) => void;
  navigateToScreen: (screen: UnifiedSessionState['currentScreen']) => void;
  selectSport: (sportId: string, sportName: string) => void;
  selectEvent: (event: SportsEvent | null) => void;
  selectMarket: (marketId: string, marketName: string) => void;
  toggleSelection: (event: SportsEvent, marketId: string, selectionId: string) => void;
  removeSelection: (selectionId: string) => void;
  clearBetslip: () => void;
  setBetslipOpen: (open: boolean) => void;
  submitBet: (stake: number) => Promise<boolean>;
  
  // Social Room
  joinRoom: (event: SportsEvent) => void;
  leaveRoom: () => void;
  sendRoomMessage: (text: string) => void;
  sendRoomReaction: (emoji: string) => void;
  voteRoomPoll: (pollId: string, option: string) => void;

  // Session Memory & Smart Resume (Phase 15)
  sessionMemory: SessionMemory | null;
  resumeSession: () => void;
  clearMemory: () => void;

  // Contextual Notifications (Phase 19)
  notifications: InAppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Recovery & Chaos Sandbox
  triggerChaosNetworkLoss: (durationMs?: number) => void;
  triggerChaosOddsDrift: () => void;
  triggerChaosLatencySpike: () => void;
  dismissRecoveryLifeboat: () => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId] = useState<string>(() => 'sess-' + Math.random().toString(36).substring(2, 9));
  const [eventsLog, setEventsLog] = useState<CanonicalEvent[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>(INITIAL_EVENTS);
  const [activeEvent, setActiveEvent] = useState<SportsEvent | null>(INITIAL_EVENTS[0]);
  const [betslip, setBetslip] = useState<SlipItem[]>([]);
  const [receipts, setReceipts] = useState<WagerReceipt[]>([]);
  const [isBetslipOpen, setBetslipOpen] = useState<boolean>(false);
  const [rooms, setRooms] = useState<LiveMatchRoom[]>([]);
  const [activeCustomRoom, setActiveCustomRoom] = useState<LiveMatchRoom | null>(null);

  // Social Identity State (Phase 12)
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('waypoint_prototype_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.loginStreak = calculateLoginStreak(parsed.loginStreak);
        return parsed;
      }
    } catch {}
    return createDefaultUser();
  });

  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>(() =>
    getInitialRoomParticipants(user || createDefaultUser(), false)
  );

  const [roomPredictions, setRoomPredictions] = useState<RoomPrediction[]>([
    {
      id: 'pred-1',
      roomId: 'global',
      eventId: INITIAL_EVENTS[0].id,
      question: 'Which team will score the next goal before 80m?',
      options: [
        { id: 'opt-home', text: 'England' },
        { id: 'opt-away', text: 'Croatia' },
        { id: 'opt-none', text: 'No more goals' },
      ],
      status: 'OPEN',
      createdAt: Date.now() - 300000,
      userVotes: {},
    },
  ]);

  // Session Memory State (Phase 15)
  const [sessionMemory, setSessionMemory] = useState<SessionMemory | null>(() => loadSessionMemory(INITIAL_EVENTS));

  // Contextual Notifications (Phase 19)
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => loadInAppNotifications());

  const [state, setState] = useState<UnifiedSessionState>({
    sessionId,
    currentScreen: 'home',
    currentSport: { id: '00', name: 'Football' },
    currentEvent: { id: INITIAL_EVENTS[0].id, name: `${INITIAL_EVENTS[0].homeTeam} vs ${INITIAL_EVENTS[0].awayTeam}` },
    currentMarket: null,
    currentSelection: null,
    journeyStage: 'DISCOVERY',
    healthState: 'HEALTHY',
    sessionQuality: {
      relevance: 100,
      informedness: 60,
      friction: 100,
      momentum: 50,
      recovery: 100,
      overallScore: 82,
    },
    frictionSignals: [],
    momentum: 'STABLE',
    momentumScore: 50,
    intentContext: {
      level: 'LOW',
      activeGoal: 'Browsing Featured Sports',
      lastIntentTimestamp: Date.now(),
    },
    pendingAction: {
      inFlight: false,
      idempotencyKey: null,
      actionType: null,
      payload: null,
      startedAt: null,
    },
    recoveryState: {
      isRecovering: false,
      reason: null,
      recoveredReceipt: null,
    },
    socialRoomContext: {
      activeRoomId: null,
      activeUsersCount: 0,
      lastInteraction: null,
      currentUserId: user?.id || null,
      roomRank: 2,
    },
    sessionDna: 'STANDARD',
    sessionDnaTrail: ['START[Home]'],
  });

  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>({
    riskScore: 0.05,
    riskLevel: 'LOW',
    reasons: ['Nominal telemetry baseline'],
    evidence: {},
  });

  // Telemetry Event Dispatcher & State Mutator
  const emitEvent = useCallback(
    (type: CanonicalEventType, metadata: any = {}, entityContext: any = {}) => {
      const timestamp = Date.now();
      const seq = eventsLog.length + 1;

      const newEvent: CanonicalEvent = {
        id: `evt-${seq}-${Math.random().toString(36).substring(2, 6)}`,
        sessionId,
        timestamp,
        sequenceNumber: seq,
        eventType: type,
        platform: window.innerWidth < 768 ? 'web-mobile' : 'web-desktop',
        product: 'sports',
        journeyStage: state.journeyStage,
        sessionHealth: state.healthState,
        entityContext: {
          sportId: state.currentSport?.id,
          sportName: state.currentSport?.name,
          eventId: state.currentEvent?.id,
          eventName: state.currentEvent?.name,
          marketId: state.currentMarket?.id,
          marketName: state.currentMarket?.name,
          selectionId: state.currentSelection?.id,
          selectionName: state.currentSelection?.name,
          roomId: state.socialRoomContext.activeRoomId || undefined,
          ...entityContext,
        },
        metadata,
        source:
          type === 'CONNECTION_LOST' || type === 'CONNECTION_RESTORED'
            ? 'network_monitor'
            : type.startsWith('RECOVERY')
            ? 'recovery_engine'
            : type.startsWith('SESSION')
            ? 'system_lifecycle'
            : 'user_action',
      };

      const updatedLog = [...eventsLog, newEvent];
      setEventsLog(updatedLog);

      // Save Authoritative Live Telemetry for Cross-Route Bridge (User -> Admin)
      saveAuthoritativeLiveTelemetry(sessionId, updatedLog);

      // Record Customer Session Activity Projection (Phase 17)
      recordSessionActivity(newEvent);

      // FSM Engine Progressions
      const nextJourney = transitionJourneyStage(state.journeyStage, newEvent);
      const activeFrictions = evaluateFrictionRules(
        updatedLog,
        state.recoveryState.isRecovering
      );
      const nextHealth = transitionHealthState(state.healthState, newEvent, activeFrictions);
      const nextQuality = calculateSessionQuality(updatedLog, activeFrictions, nextHealth);
      const { trend: momentumTrend, score: momentumScore } = evaluateMomentum(updatedLog);
      const nextRisk = calculateRiskAssessment(
        nextHealth,
        activeFrictions,
        state.pendingAction.inFlight,
        state.intentContext.level
      );
      const dna = deriveSessionDna(updatedLog);

      setRiskAssessment(nextRisk);

      // Track DNA Trail
      const newStep = `${type.replace(/_/g, ' ')}[${nextJourney}]`;
      const updatedTrail = [...state.sessionDnaTrail, newStep].slice(-8);

      setState(prev => ({
        ...prev,
        journeyStage: nextJourney,
        healthState: nextHealth,
        sessionQuality: nextQuality,
        frictionSignals: activeFrictions,
        momentum: momentumTrend,
        momentumScore,
        sessionDna: dna,
        sessionDnaTrail: updatedTrail,
        intentContext: {
          ...prev.intentContext,
          level: ['DECISION', 'ACTION', 'COMPLETION'].includes(nextJourney) ? 'HIGH' : 'MEDIUM',
          lastIntentTimestamp: timestamp,
        },
      }));

      // Easter Egg: Waypoint Found upon reaching COMPLETION stage
      if (nextJourney === 'COMPLETION') {
        unlockAchievement('ach-waypoint');
      }
    },
    [eventsLog, sessionId, state]
  );

  // Initialize Session Started event once
  useEffect(() => {
    emitEvent('SESSION_STARTED', { userAgent: navigator.userAgent, referrer: document.referrer });
  }, []);

  // Save user profile changes to prototype local storage and accounts registry
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('waypoint_prototype_user', JSON.stringify(user));
        savePrototypeAccount(user);
      } catch {}
    }
  }, [user]);

  // Synchronize Session Memory whenever meaningful state changes
  useEffect(() => {
    const mem = buildSessionMemory(state, eventsLog, activeEvent, betslip);
    if (mem) {
      saveSessionMemory(mem);
      setSessionMemory(mem);
    }
  }, [state, eventsLog, activeEvent, betslip]);

  // Evaluate Contextual Notifications (Phase 19)
  useEffect(() => {
    if (eventsLog.length > 1) {
      const candidate = evaluateContextualNotification({
        state,
        eventsLog,
        events,
        rooms,
      });
      if (candidate) {
        const added = addInAppNotification(candidate, events);
        if (added) {
          setNotifications(loadInAppNotifications());
          emitEvent('NOTIFICATION_GENERATED', {
            notificationId: added.id,
            category: added.category,
            journeyStage: added.journeyStage,
          });
        }
      }
    }
  }, [state.currentSport, state.currentEvent, state.healthState, state.socialRoomContext.activeRoomId, state.journeyStage]);

  // Social Identity Actions
  const loginUser = (username: string, displayName?: string, avatar?: string) => {
    const cleanUser = username.trim().toLowerCase();
    const validation = validateUsername(cleanUser);
    if (!validation.valid) {
      console.warn('Invalid username:', validation.error);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if account already exists in prototype accounts registry
    const existing = findPrototypeAccount(cleanUser);
    let resolvedUser: UserProfile;

    if (existing) {
      // Restore existing profile and recalculate login streak
      const updatedStreak = calculateLoginStreak(existing.loginStreak, todayStr);
      resolvedUser = {
        ...existing,
        displayName: displayName?.trim() || existing.displayName || cleanUser,
        avatar: avatar || existing.avatar || '🦁',
        loginStreak: updatedStreak,
      };
    } else {
      // Create new prototype profile
      resolvedUser = {
        id: `usr-${cleanUser}-${Math.random().toString(36).substring(2, 6)}`,
        username: cleanUser,
        displayName: displayName?.trim() || username.trim(),
        avatar: avatar || '🦁',
        bio: 'Match fan & live prediction competitor.',
        createdAt: Date.now(),
        loginStreak: {
          currentStreak: 1,
          longestStreak: 1,
          lastLoginDate: todayStr,
        },
        stats: {
          roomsParticipated: 1,
          roomsCreated: 0,
          predictionsMade: 0,
          predictionsCorrect: 0,
          roomWins: 0,
          totalPoints: 10,
        },
        achievements: [
          {
            id: 'ach-welcome',
            title: 'FIRST STEP',
            description: 'Entered the Waypoint prototype arena.',
            icon: '🎯',
            unlockedAt: Date.now(),
            category: 'social',
          },
        ],
      };
    }

    setUser(resolvedUser);
    savePrototypeAccount(resolvedUser);
    setRoomParticipants(getInitialRoomParticipants(resolvedUser, false));
    setState(prev => ({
      ...prev,
      socialRoomContext: {
        ...prev.socialRoomContext,
        currentUserId: resolvedUser.id,
      },
    }));

    emitEvent('USER_LOGGED_IN', { userId: resolvedUser.id, username: resolvedUser.username });
  };

  const logoutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem('waypoint_prototype_user');
    } catch {}
    setState(prev => ({
      ...prev,
      socialRoomContext: {
        ...prev.socialRoomContext,
        currentUserId: null,
      },
    }));
  };

  const unlockAchievement = (achievementId: string) => {
    if (!user) return;
    if (user.achievements.some(a => a.id === achievementId)) return;

    const catalog = CATALOG_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!catalog) return;

    const newAch: UserAchievement = {
      ...catalog,
      unlockedAt: Date.now(),
    };

    setUser(prev => (prev ? { ...prev, achievements: [...prev.achievements, newAch] } : prev));
    emitEvent('ACHIEVEMENT_UNLOCKED', { achievementId: newAch.id, title: newAch.title });
  };

  const updateUserProfile = (updates: Partial<Pick<UserProfile, 'displayName' | 'avatar' | 'bio'>>) => {
    if (!user) return;
    setUser(prev => (prev ? { ...prev, ...updates } : prev));
    setRoomParticipants(prev =>
      prev.map(p => (p.userId === user.id ? { ...p, ...updates } : p))
    );
    emitEvent('PROFILE_UPDATED', { updates });
  };

  const makePrediction = (predictionId: string, optionId: string) => {
    if (!user) return;
    setRoomPredictions(prev =>
      prev.map(pred =>
        pred.id === predictionId
          ? { ...pred, userVotes: { ...pred.userVotes, [user.id]: optionId } }
          : pred
      )
    );

    // Update user stats
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          predictionsMade: prev.stats.predictionsMade + 1,
        },
      };
    });

    // Update room participants
    setRoomParticipants(prev =>
      prev.map(p =>
        p.userId === user.id ? { ...p, predictionsCount: p.predictionsCount + 1 } : p
      )
    );

    // Trigger first prediction achievement
    unlockAchievement('ach-first-pred');

    emitEvent('PREDICTION_MADE', {
      predictionId,
      optionId,
      userId: user.id,
    });
  };

  const resolvePrediction = (predictionId: string, correctOptionId: string) => {
    const pred = roomPredictions.find(p => p.id === predictionId);
    if (!pred) return;

    const userVoted = user ? pred.userVotes?.[user.id] : undefined;
    const isCorrect = userVoted === correctOptionId;

    setRoomPredictions(prev =>
      prev.map(p =>
        p.id === predictionId
          ? { ...p, status: 'RESOLVED', correctOptionId, resolvedAt: Date.now() }
          : p
      )
    );

    if (user && isCorrect) {
      setUser(prev => {
        if (!prev) return prev;
        const newCorrect = prev.stats.predictionsCorrect + 1;
        const newScore = calculateSocialScore(newCorrect, prev.stats.predictionsMade, false);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            predictionsCorrect: newCorrect,
            totalPoints: newScore,
          },
        };
      });

      // Update participant score and re-rank
      setRoomParticipants(prev => {
        const updated = prev.map(p => {
          if (p.userId === user.id) {
            const newCorrect = p.correctCount + 1;
            const newScore = calculateSocialScore(newCorrect, p.predictionsCount, p.role === 'host');
            return {
              ...p,
              correctCount: newCorrect,
              score: newScore,
            };
          }
          return p;
        });
        updated.sort((a, b) => b.score - a.score);
        return updated.map((p, idx) => ({ ...p, rank: idx + 1 }));
      });

      // Check for achievements
      if (user.stats.predictionsCorrect + 1 >= 5) {
        unlockAchievement('ach-football-expert');
      }
    }

    emitEvent('PREDICTION_RESOLVED', {
      predictionId,
      correctOptionId,
      userWon: isCorrect,
    });
  };

  const roomLeaderboard: RoomLeaderboardEntry[] = buildRoomLeaderboard(
    roomParticipants,
    user?.id || ''
  );

  const navigateToScreen = (screen: UnifiedSessionState['currentScreen']) => {
    setState(prev => ({ ...prev, currentScreen: screen }));
    emitEvent('SCREEN_VIEWED', { screen });
  };

  const selectSport = (sportId: string, sportName: string) => {
    setState(prev => ({ ...prev, currentSport: { id: sportId, name: sportName } }));
    emitEvent('SPORT_VIEWED', { sportId, sportName });
  };

  const selectEvent = (event: SportsEvent | null) => {
    setActiveEvent(event);
    if (event) {
      setState(prev => ({
        ...prev,
        currentEvent: { id: event.id, name: `${event.homeTeam} vs ${event.awayTeam}`, score: event.score ? `${event.score.home}-${event.score.away}` : undefined },
      }));
      emitEvent('EVENT_VIEWED', {
        eventId: event.id,
        tournament: event.tournament,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
      });
      // Record in Recently Viewed (Phase 17)
      recordRecentlyViewed(event, events);
    }
  };

  const selectMarket = (marketId: string, marketName: string) => {
    setState(prev => ({ ...prev, currentMarket: { id: marketId, name: marketName } }));
    emitEvent('MARKET_VIEWED', { marketId, marketName });
  };

  const toggleSelection = (event: SportsEvent, marketId: string, selectionId: string) => {
    const market = event.markets.find(m => m.id === marketId);
    if (!market) return;
    const selection = market.selections.find(s => s.id === selectionId);
    if (!selection) return;

    setBetslip(prev => {
      const exists = prev.some(item => item.selectionId === selectionId);
      if (exists) {
        emitEvent('SELECTION_VIEWED', { action: 'DESELECTED', selectionId });
        return prev.filter(item => item.selectionId !== selectionId);
      } else {
        const newItem: SlipItem = {
          eventId: event.id,
          eventName: `${event.homeTeam} vs ${event.awayTeam}`,
          marketId: market.id,
          marketName: market.name,
          selectionId: selection.id,
          selectionName: selection.name,
          odds: selection.odds,
        };
        emitEvent('SELECTION_ADDED', {
          selectionId: selection.id,
          odds: selection.odds,
          marketName: market.name,
        });

        // Ensure activeEvent and currentMarket match selected context
        setActiveEvent(event);
        setState(s => ({
          ...s,
          currentEvent: { id: event.id, name: `${event.homeTeam} vs ${event.awayTeam}`, score: event.score ? `${event.score.home}-${event.score.away}` : undefined },
          currentMarket: { id: market.id, name: market.name },
          currentSelection: { id: selection.id, name: selection.name, odds: selection.odds },
        }));

        return [...prev, newItem];
      }
    });
  };

  const removeSelection = (selectionId: string) => {
    setBetslip(prev => prev.filter(item => item.selectionId !== selectionId));
    emitEvent('SELECTION_VIEWED', { action: 'REMOVED_FROM_SLIP', selectionId });
  };

  const clearBetslip = () => {
    setBetslip([]);
  };

  const submitBet = async (stake: number): Promise<boolean> => {
    if (betslip.length === 0 || stake <= 0) return false;

    const idempotencyKey = 'idemp-' + Math.random().toString(36).substring(2, 9);
    emitEvent('ACTION_STARTED', {
      stake,
      itemsCount: betslip.length,
      idempotencyKey,
    });

    setState(prev => ({
      ...prev,
      pendingAction: {
        inFlight: true,
        idempotencyKey,
        actionType: 'SPORTS_WAGER',
        payload: { stake, items: [...betslip] },
        startedAt: Date.now(),
      },
    }));

    if (state.recoveryState.isRecovering) {
      emitEvent('ACTION_FAILED', {
        reason: 'NETWORK_DROPOUT_DURING_CONFIRMATION',
        idempotencyKey,
      });
      return false;
    }

    return new Promise(resolve => {
      setTimeout(() => {
        const totalOdds = betslip.reduce((acc, curr) => acc * curr.odds, 1);
        const tax = +(stake * 0.05).toFixed(2);
        const bonus = betslip.length > 2 ? +(stake * 0.1).toFixed(2) : 0;
        const potentialReturn = +((stake - tax) * totalOdds + bonus).toFixed(2);

        const receipt: WagerReceipt = {
          ticketId: 'TCK-' + Math.floor(100000 + Math.random() * 900000),
          idempotencyKey,
          timestamp: Date.now(),
          items: [...betslip],
          stake,
          tax,
          bonus,
          potentialReturn,
          status: 'CONFIRMED',
        };

        setReceipts(prev => [receipt, ...prev]);

        setState(prev => ({
          ...prev,
          pendingAction: {
            inFlight: false,
            idempotencyKey: null,
            actionType: null,
            payload: null,
            startedAt: null,
          },
          recoveryState: {
            isRecovering: false,
            reason: null,
            recoveredReceipt: receipt,
          },
        }));

        emitEvent('ACTION_CONFIRMED', {
          ticketId: receipt.ticketId,
          idempotencyKey,
          potentialReturn,
        });

        // Easter Egg: First protected action / journey discovery (non-monetary social achievement)
        unlockAchievement('ach-welcome');
        unlockAchievement('ach-first-action');

        clearBetslip();
        resolve(true);
      }, 700);
    });
  };

  // Social Room Actions & Custom Live Match Rooms
  const createCustomRoom = (
    name: string,
    event: SportsEvent,
    privacy: 'friends_with_link' | 'public' = 'friends_with_link'
  ): LiveMatchRoom => {
    // Generate deterministic 6-character room code (e.g. AB7KQ2)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newRoom: LiveMatchRoom = {
      roomId: 'room-' + Math.random().toString(36).substring(2, 9),
      roomCode: code,
      roomName: name.trim() || `${event.homeTeam} vs ${event.awayTeam} Room`,
      eventId: event.id,
      sportId: event.sportId,
      createdAt: Date.now(),
      creatorSessionId: sessionId,
      privacy,
      participantCount: 1,
    };

    setRooms(prev => [newRoom, ...prev]);
    setActiveCustomRoom(newRoom);
    selectEvent(event);

    // Host room participants setup
    const currentUser = user || createDefaultUser();
    setRoomParticipants(getInitialRoomParticipants(currentUser, true));

    // Achievements: First room & Host
    unlockAchievement('ach-first-room');
    if (user && user.stats.roomsCreated + 1 >= 3) {
      unlockAchievement('ach-host');
    }

    if (user) {
      setUser(prev =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                roomsCreated: prev.stats.roomsCreated + 1,
                roomsParticipated: prev.stats.roomsParticipated + 1,
              },
            }
          : prev
      );
    }

    setState(prev => ({
      ...prev,
      currentScreen: 'room',
      socialRoomContext: {
        activeRoomId: newRoom.roomId,
        activeUsersCount: newRoom.participantCount,
        lastInteraction: `Created Room: ${newRoom.roomName}`,
        currentUserId: user?.id || null,
        roomRank: 1,
      },
    }));

    emitEvent('ROOM_CREATED', {
      roomId: newRoom.roomId,
      roomCode: newRoom.roomCode,
      roomName: newRoom.roomName,
      eventId: event.id,
      sportId: event.sportId,
      creatorSessionId: sessionId,
    });

    emitEvent('ROOM_JOINED', {
      roomId: newRoom.roomId,
      roomCode: newRoom.roomCode,
      eventId: event.id,
      participantCount: newRoom.participantCount,
      role: 'host',
    });

    // Record User Room Association (Phase 17)
    recordUserRoom(newRoom, 'host');

    return newRoom;
  };

  const joinRoomByCode = (code: string): { success: boolean; error?: string } => {
    const cleanCode = code.trim().toUpperCase();
    const foundRoom = rooms.find(r => r.roomCode.toUpperCase() === cleanCode);
    if (!foundRoom) {
      return { success: false, error: 'Room not found. Check the room code and try again.' };
    }

    // Increment participant count in memory
    const updatedCount = foundRoom.participantCount + 1;
    foundRoom.participantCount = updatedCount;
    setRooms(prev => prev.map(r => (r.roomId === foundRoom.roomId ? { ...r, participantCount: updatedCount } : r)));

    joinCustomRoom(foundRoom);
    return { success: true };
  };

  const joinCustomRoom = (room: LiveMatchRoom) => {
    const matchedEvent = events.find(e => e.id === room.eventId) || events[0];
    selectEvent(matchedEvent);
    setActiveCustomRoom(room);

    const currentUser = user || createDefaultUser();
    setRoomParticipants(getInitialRoomParticipants(currentUser, false));

    setState(prev => ({
      ...prev,
      currentScreen: 'room',
      socialRoomContext: {
        activeRoomId: room.roomId,
        activeUsersCount: room.participantCount,
        lastInteraction: `Joined ${room.roomName}`,
        currentUserId: currentUser.id,
        roomRank: 2,
      },
    }));

    emitEvent('ROOM_JOINED', {
      roomId: room.roomId,
      roomCode: room.roomCode,
      eventId: room.eventId,
      participantCount: room.participantCount,
      role: 'participant',
    });

    // Record User Room Association (Phase 17)
    recordUserRoom(room, 'participant');
  };

  const joinRoom = (event: SportsEvent) => {
    selectEvent(event);
    setActiveCustomRoom(null);
    const currentUser = user || createDefaultUser();
    setRoomParticipants(getInitialRoomParticipants(currentUser, false));

    setState(prev => ({
      ...prev,
      currentScreen: 'room',
      socialRoomContext: {
        activeRoomId: event.id,
        activeUsersCount: event.activeRoomParticipants || 150,
        lastInteraction: 'Joined Room',
        currentUserId: currentUser.id,
        roomRank: 2,
      },
    }));
    emitEvent('ROOM_JOINED', { roomId: event.id, participants: event.activeRoomParticipants });

    // Record User Room Association for fixture room
    const mockRoom: LiveMatchRoom = {
      roomId: `room-auto-${event.id}`,
      roomCode: event.id.substring(event.id.length - 6).toUpperCase().replace(/[^A-Z0-9]/g, '8'),
      roomName: `${event.homeTeam} vs ${event.awayTeam} Match Room`,
      eventId: event.id,
      sportId: event.sportId,
      createdAt: Date.now(),
      creatorSessionId: 'system',
      privacy: 'public',
      participantCount: event.activeRoomParticipants || 150,
    };
    recordUserRoom(mockRoom, 'participant');
  };

  const leaveRoom = () => {
    setActiveCustomRoom(null);
    setState(prev => ({
      ...prev,
      currentScreen: 'sports',
      socialRoomContext: {
        activeRoomId: null,
        activeUsersCount: 0,
        lastInteraction: 'Left Room',
      },
    }));
  };

  const sendRoomMessage = (text: string) => {
    emitEvent('ROOM_MESSAGE_SENT', { textLength: text.length });
  };

  const sendRoomReaction = (emoji: string) => {
    emitEvent('ROOM_REACTION', { emoji });
  };

  const voteRoomPoll = (pollId: string, option: string) => {
    emitEvent('ROOM_POLL', { pollId, option });
  };

  // CHAOS CONTROLS & RESILIENCE
  const triggerChaosNetworkLoss = (durationMs = 4500) => {
    emitEvent('CONNECTION_LOST', { simulated: true });
    setState(prev => ({
      ...prev,
      recoveryState: {
        isRecovering: true,
        reason: 'Connection interrupted while session active. Selections and state cached safely.',
        recoveredReceipt: null,
      },
    }));

    setTimeout(() => {
      emitEvent('CONNECTION_RESTORED', { downtimeMs: durationMs });
      emitEvent('RECOVERY_STARTED', { reason: 'Network re-established' });

      setTimeout(() => {
        emitEvent('RECOVERY_COMPLETED', { restoredIdempotencyKey: state.pendingAction.idempotencyKey });
        
        // Easter egg: Survivor milestone
        unlockAchievement('ach-lifeboat');

        setState(prev => ({
          ...prev,
          recoveryState: {
            ...prev.recoveryState,
            isRecovering: false,
          },
        }));
      }, 900);
    }, durationMs);
  };

  const triggerChaosOddsDrift = () => {
    setEvents(prev =>
      prev.map(ev => ({
        ...ev,
        markets: ev.markets.map(m => ({
          ...m,
          selections: m.selections.map(s => {
            const shift = +(s.odds + (Math.random() > 0.5 ? 0.20 : -0.20)).toFixed(2);
            return {
              ...s,
              previousOdds: s.odds,
              odds: Math.max(1.05, shift),
              trend: shift > s.odds ? 'UP' : 'DOWN',
            };
          }),
        })),
      }))
    );

    setBetslip(prev =>
      prev.map(item => ({
        ...item,
        driftWarning: true,
        previousOdds: item.odds,
        odds: +(item.odds + 0.15).toFixed(2),
      }))
    );

    emitEvent('SELECTION_VIEWED', { event: 'ODDS_DRIFT_DETECTED' });
  };

  const triggerChaosLatencySpike = () => {
    emitEvent('SCREEN_VIEWED', { warning: 'API_LATENCY_SPIKE_2800MS' });
  };

  const dismissRecoveryLifeboat = () => {
    setState(prev => ({
      ...prev,
      recoveryState: { ...prev.recoveryState, isRecovering: false },
    }));
  };

  // Session Memory Controls (Phase 15)
  const resumeSession = useCallback(() => {
    const memory = loadSessionMemory(events);
    if (!memory || !memory.resumable) return;

    // 1. Restore Sport
    if (memory.lastSport) {
      setState(prev => ({ ...prev, currentSport: memory.lastSport || prev.currentSport }));
    }

    // 2. Restore Event / Fixture
    if (memory.lastEventId) {
      const foundEvent = events.find(e => e.id === memory.lastEventId) || INITIAL_EVENTS.find(e => e.id === memory.lastEventId);
      if (foundEvent) {
        setActiveEvent(foundEvent);
        setState(prev => ({
          ...prev,
          currentEvent: {
            id: foundEvent.id,
            name: `${foundEvent.homeTeam} vs ${foundEvent.awayTeam}`,
            score: foundEvent.score ? `${foundEvent.score.home}-${foundEvent.score.away}` : undefined,
          },
        }));
      }
    }

    // 3. Restore Market
    if (memory.lastMarket) {
      setState(prev => ({ ...prev, currentMarket: memory.lastMarket || null }));
    }

    // 4. Restore Selection
    if (memory.lastSelection) {
      setState(prev => ({ ...prev, currentSelection: memory.lastSelection || null }));
    }

    // 5. Restore Betslip (Safe Context: does NOT auto-submit wager)
    if (memory.savedBetslip && memory.savedBetslip.length > 0) {
      setBetslip(memory.savedBetslip);
      setBetslipOpen(true);
    }

    // 6. Restore Room screen if room context was active
    if (memory.roomId) {
      const foundCustomRoom = rooms.find(r => r.roomId === memory.roomId);
      if (foundCustomRoom) {
        joinCustomRoom(foundCustomRoom);
      } else {
        const foundEvent = events.find(e => e.id === memory.roomId);
        if (foundEvent) {
          joinRoom(foundEvent);
        }
      }
    } else {
      // Return to sports screen if not in room
      setState(prev => ({ ...prev, currentScreen: 'sports' }));
    }

    // 7. Emit canonical resumption event
    emitEvent('SESSION_RESUMED', {
      resumedSessionId: memory.sessionId,
      interrupted: memory.interrupted,
      restoredItemsCount: memory.savedBetslip?.length || 0,
      targetFixture: memory.lastFixture?.name || memory.lastEventId,
    });
  }, [events, rooms, emitEvent]);

  const clearMemory = useCallback(() => {
    clearSessionMemory();
    setSessionMemory(null);
  }, []);

  const resetSession = useCallback(() => {
    const newSessionId = 'sess-' + Math.random().toString(36).substring(2, 9);
    setBetslip([]);
    setReceipts([]);
    setBetslipOpen(false);
    setActiveEvent(INITIAL_EVENTS[0]);
    setEvents(INITIAL_EVENTS);
    setRooms([]);
    setActiveCustomRoom(null);

    // Reset user to baseline default
    const freshUser = createDefaultUser();
    setUser(freshUser);
    setRoomParticipants(getInitialRoomParticipants(freshUser, false));
    try {
      localStorage.removeItem('waypoint_prototype_user');
    } catch {}

    // Clear session memory on explicit demo reset
    clearSessionMemory();
    setSessionMemory(null);

    // Reset Customer Context Layer (Phase 17)
    resetCustomerContext();

    // Reset Contextual Notifications (Phase 19)
    clearInAppNotifications();
    setNotifications([]);

    const initialEvent: CanonicalEvent = {
      id: `evt-1-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: newSessionId,
      timestamp: Date.now(),
      sequenceNumber: 1,
      eventType: 'SESSION_STARTED',
      platform: window.innerWidth < 768 ? 'web-mobile' : 'web-desktop',
      product: 'sports',
      journeyStage: 'DISCOVERY',
      sessionHealth: 'HEALTHY',
      entityContext: { sportName: 'Football' },
      metadata: { userAgent: navigator.userAgent, resetTriggered: true },
      source: 'system_lifecycle',
    };

    setEventsLog([initialEvent]);
    saveAuthoritativeLiveTelemetry(newSessionId, [initialEvent]);

    setState({
      sessionId: newSessionId,
      currentScreen: 'home',
      currentSport: { id: '00', name: 'Football' },
      currentEvent: { id: INITIAL_EVENTS[0].id, name: `${INITIAL_EVENTS[0].homeTeam} vs ${INITIAL_EVENTS[0].awayTeam}` },
      currentMarket: null,
      currentSelection: null,
      journeyStage: 'DISCOVERY',
      healthState: 'HEALTHY',
      sessionQuality: {
        relevance: 100,
        informedness: 60,
        friction: 100,
        momentum: 50,
        recovery: 100,
        overallScore: 82,
      },
      frictionSignals: [],
      momentum: 'STABLE',
      momentumScore: 50,
      intentContext: {
        level: 'LOW',
        activeGoal: 'Browsing Featured Sports',
        lastIntentTimestamp: Date.now(),
      },
      pendingAction: {
        inFlight: false,
        idempotencyKey: null,
        actionType: null,
        payload: null,
        startedAt: null,
      },
      recoveryState: {
        isRecovering: false,
        reason: null,
        recoveredReceipt: null,
      },
      socialRoomContext: {
        activeRoomId: null,
        activeUsersCount: 0,
        lastInteraction: null,
        currentUserId: freshUser.id,
        roomRank: 2,
      },
      sessionDna: 'STANDARD',
      sessionDnaTrail: ['START[Home]'],
    });

    setRiskAssessment({
      riskScore: 0.05,
      riskLevel: 'LOW',
      reasons: ['Nominal telemetry baseline'],
      evidence: {},
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        state,
        eventsLog,
        events,
        activeEvent,
        betslip,
        receipts,
        isBetslipOpen,
        riskAssessment,
        rooms,
        activeCustomRoom,
        createCustomRoom,
        joinRoomByCode,
        joinCustomRoom,
        user,
        loginUser,
        logoutUser,
        updateUserProfile,
        unlockAchievement,
        roomParticipants,
        roomLeaderboard,
        roomPredictions,
        makePrediction,
        resolvePrediction,
        emitEvent,
        navigateToScreen,
        selectSport,
        selectEvent,
        selectMarket,
        toggleSelection,
        removeSelection,
        clearBetslip,
        setBetslipOpen,
        submitBet,
        joinRoom,
        leaveRoom,
        sendRoomMessage,
        sendRoomReaction,
        voteRoomPoll,
        sessionMemory,
        resumeSession,
        clearMemory,
        notifications,
        unreadNotificationCount: notifications.filter(n => !n.read).length,
        markNotificationRead: (id: string) => {
          const updated = markNotificationAsRead(id);
          setNotifications(updated);
          emitEvent('NOTIFICATION_OPENED', { notificationId: id });
        },
        markAllNotificationsRead: () => {
          const updated = markAllNotificationsAsRead();
          setNotifications(updated);
        },
        dismissNotification: (id: string) => {
          const filtered = notifications.filter(n => n.id !== id);
          saveInAppNotifications(filtered);
          setNotifications(filtered);
          emitEvent('NOTIFICATION_DISMISSED', { notificationId: id });
        },
        clearNotifications: () => {
          clearInAppNotifications();
          setNotifications([]);
        },
        triggerChaosNetworkLoss,
        triggerChaosOddsDrift,
        triggerChaosLatencySpike,
        dismissRecoveryLifeboat,
        resetSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
