import {
  CanonicalEvent,
  FrictionSignal,
  HealthState,
  JourneyStage,
  MomentumTrend,
  RiskAssessment,
  SessionDnaProfile,
  SessionQualityBreakdown,
  UnifiedSessionState,
} from '../types/canonical';

/**
 * DETERMINISTIC STATE MACHINES
 */
export function transitionJourneyStage(
  currentStage: JourneyStage,
  event: CanonicalEvent
): JourneyStage {
  switch (event.eventType) {
    case 'SESSION_STARTED':
      return 'DISCOVERY';
    case 'SCREEN_VIEWED':
      if (event.metadata?.screen === 'home') return 'DISCOVERY';
      if (currentStage === 'DISCOVERY') return 'EXPLORATION';
      return currentStage;
    case 'SPORT_VIEWED':
    case 'EVENT_VIEWED':
      return currentStage === 'DISCOVERY' ? 'EXPLORATION' : currentStage;
    case 'MARKET_VIEWED':
    case 'SELECTION_VIEWED':
    case 'SELECTION_ADDED':
    case 'BETSLIP_OPENED':
    case 'ROOM_JOINED':
      return 'DECISION';
    case 'ACTION_STARTED':
    case 'GAME_LAUNCH_STARTED':
      return 'ACTION';
    case 'ACTION_CONFIRMED':
    case 'GAME_LAUNCH_SUCCESS':
      return 'COMPLETION';
    default:
      return currentStage;
  }
}

export function transitionHealthState(
  currentHealth: HealthState,
  event: CanonicalEvent,
  frictions: FrictionSignal[]
): HealthState {
  if (event.eventType === 'SESSION_STARTED') {
    return frictions.length === 0 ? 'HEALTHY' : 'FRICTION';
  }
  if (event.eventType === 'CONNECTION_LOST' || event.eventType === 'ACTION_FAILED') {
    return 'AT_RISK';
  }
  if (event.eventType === 'RECOVERY_STARTED') {
    return 'RECOVERING';
  }
  if (event.eventType === 'RECOVERY_COMPLETED') {
    return 'RECOVERED';
  }
  if (event.eventType === 'ACTION_CONFIRMED' || event.eventType === 'CONNECTION_RESTORED') {
    if (frictions.length === 0) return 'HEALTHY';
    return 'FRICTION';
  }

  // Evaluate friction severity
  const hasHighFriction = frictions.some(f => f.severity === 'high' || f.severity === 'critical');
  if (hasHighFriction) return 'AT_RISK';
  if (frictions.length > 0) return 'FRICTION';

  return currentHealth === 'RECOVERED' ? 'HEALTHY' : currentHealth;
}

/**
 * DETERMINISTIC FRICTION ENGINE
 */
export function evaluateFrictionRules(
  events: CanonicalEvent[],
  pendingActionInFlight: boolean
): FrictionSignal[] {
  const signals: FrictionSignal[] = [];
  const now = Date.now();
  const recentEvents = events.slice(-15);

  // 1. Connection Loss Friction
  const recentConnLoss = recentEvents.find(
    e => e.eventType === 'CONNECTION_LOST' && now - e.timestamp < 30000
  );
  if (recentConnLoss) {
    signals.push({
      type: 'connection_loss',
      severity: pendingActionInFlight ? 'critical' : 'high',
      evidence: `Network disconnection detected while ${pendingActionInFlight ? 'submitting bet' : 'browsing'}`,
      timestamp: recentConnLoss.timestamp,
      confidence: 1.0,
      recommendedResponse: 'Activate Session Lifeboat & lock duplicate submissions',
    });
  }

  // 2. Repeated Navigation (Back & Forth Thrash)
  const screens = recentEvents.filter(e => e.eventType === 'SCREEN_VIEWED');
  if (screens.length >= 4) {
    const last4 = screens.slice(-4).map(s => s.metadata?.screen || '');
    if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
      signals.push({
        type: 'repeated_back_forth',
        severity: 'medium',
        evidence: `Rapid oscillation between ${last4[0]} and ${last4[1]} across 4 steps`,
        timestamp: now,
        confidence: 0.85,
        recommendedResponse: 'Present Smart Start contextual shortcut to stabilize discovery',
      });
    }
  }

  // 3. Odds Drift Shock (Drift while betslip is open or submitting)
  const driftEvents = recentEvents.filter(
    e => e.eventType === 'SELECTION_VIEWED' && e.metadata?.event === 'ODDS_DRIFT_DETECTED'
  );
  if (driftEvents.length > 0) {
    signals.push({
      type: 'odds_drift_shock',
      severity: pendingActionInFlight ? 'high' : 'medium',
      evidence: `Active selection odds fluctuated dynamically during decision window`,
      timestamp: driftEvents[0].timestamp,
      confidence: 0.95,
      recommendedResponse: 'Render inline drift notification with automatic price acceptance toggle',
    });
  }

  // 4. Repeated Failed Actions
  const failedActions = recentEvents.filter(e => e.eventType === 'ACTION_FAILED');
  if (failedActions.length >= 2) {
    signals.push({
      type: 'repeated_failed_action',
      severity: 'critical',
      evidence: `Consecutive submission rejections: ${failedActions.length} failures`,
      timestamp: now,
      confidence: 1.0,
      recommendedResponse: 'Halt repeated attempts; verify wallet balance and idempotency key lock',
    });
  }

  return signals;
}

/**
 * MULTI-SIGNAL EXPLAINABLE RISK MODEL
 */
export function calculateRiskAssessment(
  health: HealthState,
  frictions: FrictionSignal[],
  pendingActionInFlight: boolean,
  intentLevel: 'LOW' | 'MEDIUM' | 'HIGH'
): RiskAssessment {
  let score = 0.0;
  const reasons: string[] = [];
  const evidence: Record<string, any> = {};

  if (health === 'AT_RISK') {
    score += 0.40;
    reasons.push('Session health is in active AT_RISK state');
  } else if (health === 'FRICTION') {
    score += 0.20;
    reasons.push('Friction anomalies registered on session telemetry');
  }

  if (pendingActionInFlight) {
    score += 0.30;
    reasons.push('Wager action in-flight during active evaluation');
    evidence.pendingActionInFlight = true;
  }

  const criticalFrictions = frictions.filter(f => f.severity === 'critical' || f.severity === 'high');
  if (criticalFrictions.length > 0) {
    score += 0.25;
    reasons.push(`${criticalFrictions.length} high/critical friction signals detected`);
    evidence.criticalFrictionsCount = criticalFrictions.length;
  }

  if (intentLevel === 'HIGH') {
    score += 0.15;
    reasons.push('High intent state elevates stakes of failure');
  }

  const riskScore = Math.min(1.0, +score.toFixed(2));
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (riskScore >= 0.75) riskLevel = 'CRITICAL';
  else if (riskScore >= 0.50) riskLevel = 'HIGH';
  else if (riskScore >= 0.25) riskLevel = 'MEDIUM';

  return {
    riskScore,
    riskLevel,
    reasons,
    evidence,
  };
}

/**
 * 5-DIMENSION TRANSPARENT SESSION QUALITY SCORE
 */
export function calculateSessionQuality(
  events: CanonicalEvent[],
  frictions: FrictionSignal[],
  health: HealthState
): SessionQualityBreakdown {
  const totalEvents = events.length;

  // 1. Relevance: Ratio of targeted market/event views vs raw screen churn
  const targetedEvents = events.filter(e =>
    ['EVENT_VIEWED', 'MARKET_VIEWED', 'SELECTION_ADDED', 'ROOM_JOINED'].includes(e.eventType)
  ).length;
  const relevance = totalEvents === 0 ? 100 : Math.min(100, Math.round((targetedEvents / Math.max(1, totalEvents)) * 200));

  // 2. Informedness: Checking markets and stats depth
  const statsChecks = events.filter(e => e.eventType === 'MARKET_VIEWED' || e.eventType === 'ROOM_POLL').length;
  const informedness = Math.min(100, 50 + statsChecks * 15);

  // 3. Friction: Penalties for detected friction signals
  const frictionPenalty = frictions.reduce((acc, f) => {
    if (f.severity === 'critical') return acc + 35;
    if (f.severity === 'high') return acc + 20;
    if (f.severity === 'medium') return acc + 10;
    return acc + 5;
  }, 0);
  const friction = Math.max(0, 100 - frictionPenalty);

  // 4. Momentum: Positive actions towards outcome
  const actionProgress = events.filter(e =>
    ['SELECTION_ADDED', 'ACTION_CONFIRMED', 'ROOM_MESSAGE_SENT'].includes(e.eventType)
  ).length;
  const momentum = Math.min(100, 40 + actionProgress * 20);

  // 5. Recovery: Health status resilience
  let recovery = 100;
  if (health === 'AT_RISK') recovery = 30;
  else if (health === 'RECOVERING') recovery = 60;
  else if (health === 'RECOVERED') recovery = 95;

  const overallScore = Math.round(
    (relevance * 0.2) +
    (informedness * 0.15) +
    (friction * 0.35) +
    (momentum * 0.15) +
    (recovery * 0.15)
  );

  return {
    relevance,
    informedness,
    friction,
    momentum,
    recovery,
    overallScore,
  };
}

/**
 * MOMENTUM TREND EVALUATION
 */
export function evaluateMomentum(events: CanonicalEvent[]): { trend: MomentumTrend; score: number } {
  const recent = events.slice(-8);
  if (recent.length === 0) return { trend: 'STABLE', score: 50 };

  let positivePoints = 0;
  let negativePoints = 0;

  for (const e of recent) {
    if (['SELECTION_ADDED', 'BETSLIP_OPENED', 'ACTION_CONFIRMED', 'ROOM_JOINED'].includes(e.eventType)) {
      positivePoints += 2;
    }
    if (['CONNECTION_LOST', 'ACTION_FAILED'].includes(e.eventType)) {
      negativePoints += 3;
    }
  }

  const score = Math.max(0, Math.min(100, 50 + (positivePoints - negativePoints) * 10));
  let trend: MomentumTrend = 'STABLE';
  if (score >= 65) trend = 'RISING';
  else if (score <= 40) trend = 'DECLINING';

  return { trend, score };
}

/**
 * EXPLAINABLE BEHAVIORAL SESSION DNA
 */
export function deriveSessionDna(events: CanonicalEvent[]): SessionDnaProfile {
  const types = events.map(e => e.eventType);

  const roomEvents = types.filter(t => t.startsWith('ROOM_')).length;
  if (roomEvents >= 3) return 'SOCIAL';

  const recoveryEvents = types.filter(t => t.startsWith('RECOVERY_')).length;
  if (recoveryEvents > 0) return 'RECOVERY';

  const actionStarted = types.filter(t => t === 'ACTION_STARTED').length;
  const selections = types.filter(t => t === 'SELECTION_ADDED').length;
  if (actionStarted > 0 && selections > 0) {
    if (events.length <= 8) return 'FAST-DECISION';
    return 'HIGH-INTENT';
  }

  const screenViews = types.filter(t => t === 'SCREEN_VIEWED').length;
  if (screenViews >= 5) return 'EXPLORER';

  const failures = types.filter(t => t === 'ACTION_FAILED' || t === 'CONNECTION_LOST').length;
  if (failures > 0) return 'FRICTION-HEAVY';

  return 'STANDARD';
}
