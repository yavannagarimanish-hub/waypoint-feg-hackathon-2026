import { describe, it, expect } from 'vitest';
import {
  calculateSessionQuality,
  transitionJourneyStage,
  transitionHealthState,
} from '../src/services/sessionIntelligence';
import { evaluateNotificationSafety } from '../src/services/notificationService';
import { CanonicalEvent, UnifiedSessionState } from '../src/types/canonical';

function makeEvent(eventType: CanonicalEvent['eventType']): CanonicalEvent {
  return {
    eventId: `ev_${Date.now()}`,
    sessionId: 'test_session',
    timestamp: Date.now(),
    sequenceNumber: 1,
    eventType,
  };
}

describe('Waypoint Hackathon System Integration Suite', () => {
  it('verifies end-to-end journey progression, health state, and session quality integrity', () => {
    // 1. Initial State
    let stage = transitionJourneyStage('DISCOVERY', makeEvent('SPORT_VIEWED'));
    expect(stage).toBe('EXPLORATION');

    stage = transitionJourneyStage(stage, makeEvent('BETSLIP_OPENED'));
    expect(stage).toBe('DECISION');

    stage = transitionJourneyStage(stage, makeEvent('ACTION_STARTED'));
    expect(stage).toBe('ACTION');

    stage = transitionJourneyStage(stage, makeEvent('ACTION_CONFIRMED'));
    expect(stage).toBe('COMPLETION');

    // 2. Health & Friction Detection
    let health = transitionHealthState('HEALTHY', makeEvent('CONNECTION_LOST'), []);
    expect(health).toBe('AT_RISK');

    health = transitionHealthState(health, makeEvent('RECOVERY_STARTED'), []);
    expect(health).toBe('RECOVERING');

    health = transitionHealthState(health, makeEvent('RECOVERY_COMPLETED'), []);
    expect(health).toBe('RECOVERED');

    // 3. Mathematical Quality Bounds [0, 100]
    const state: UnifiedSessionState = {
      sessionId: 'test_integration',
      sessionStartTime: Date.now(),
      journeyStage: 'ACTION',
      healthState: 'RECOVERED',
      sessionQuality: 80,
      qualityBreakdown: {
        relevanceScore: 90,
        informednessScore: 85,
        frictionPenalty: 10,
        momentumScore: 75,
        recoveryScore: 100,
      },
      momentum: { trend: 'STEADY', streakCount: 2, velocityScore: 60, lastActiveTimestamp: Date.now() },
      activeFrictionSignals: [],
      recentEvents: [],
      betslipSnapshot: [],
      isLifeboatActive: false,
    };

    const quality = calculateSessionQuality([], [], 'HEALTHY');
    expect(quality.overallScore).toBeGreaterThanOrEqual(0);
    expect(quality.overallScore).toBeLessThanOrEqual(100);
  });

  it('verifies Responsible Intelligence safety gate hard-blocks prohibited persuasion patterns', () => {
    expect(evaluateNotificationSafety('act fast before odds change').passed).toBe(false);
    expect(evaluateNotificationSafety('bet now to recover losses').passed).toBe(false);
    expect(evaluateNotificationSafety('England vs Croatia is now live').passed).toBe(true);
  });
});


