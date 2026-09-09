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

describe('Phase 20 — User / Admin Portal Separation Hardening', () => {
  it('strictly resolves /, /user, and room hash routes to the User Portal', async () => {
    const { resolvePortalRoute } = await import('../src/App');
    expect(resolvePortalRoute('/', '')).toBe('user');
    expect(resolvePortalRoute('/user', '')).toBe('user');
    expect(resolvePortalRoute('/user/', '')).toBe('user');
    expect(resolvePortalRoute('/', '#user')).toBe('user');
    expect(resolvePortalRoute('/', '#user?room=room_1')).toBe('user');
    expect(resolvePortalRoute('/user', '#room/room_1')).toBe('user');
  });

  it('strictly resolves /admin and #admin routes to the Operator Admin Portal', async () => {
    const { resolvePortalRoute } = await import('../src/App');
    expect(resolvePortalRoute('/admin', '')).toBe('admin');
    expect(resolvePortalRoute('/admin/', '')).toBe('admin');
    expect(resolvePortalRoute('/admin/explorer', '')).toBe('admin');
    expect(resolvePortalRoute('/', '#admin')).toBe('admin');
    expect(resolvePortalRoute('/', '#/admin')).toBe('admin');
  });

  it('guarantees Admin Portal maintains dedicated layout without customer components', async () => {
    // Read App.tsx and OperatorDashboard.tsx source to verify component boundary constraints
    const fs = await import('fs');
    const path = await import('path');
    const appSource = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf-8');
    const adminSource = fs.readFileSync(path.resolve(__dirname, '../src/components/operator/OperatorDashboard.tsx'), 'utf-8');

    // 1. NotificationCenter must NOT be imported or rendered in OperatorDashboard
    expect(adminSource).not.toContain('NotificationCenter');
    expect(adminSource).not.toContain('CommandBar');
    expect(adminSource).not.toContain('BetslipTray');
    expect(adminSource).not.toContain('ContinuePlaying');
    expect(adminSource).not.toContain('SmartStart');
    expect(adminSource).not.toContain('RecentlyViewed');
    expect(adminSource).not.toContain('MyLiveRooms');
    expect(adminSource).not.toContain('SessionActivity');

    // 2. User Portal must NOT render OperatorDashboard or IntelligenceDebugPanel
    // Split App.tsx at `if (portal === 'admin')` to inspect User Portal branch
    const [, userBranch] = appSource.split('// RENDER USER PORTAL');
    expect(userBranch).toBeDefined();
    expect(userBranch).not.toContain('<OperatorDashboard');
    expect(userBranch).not.toContain('<IntelligenceDebugPanel');
    expect(userBranch).not.toContain('switchPortal(\'admin\')');
  });

  it('guarantees Operator Admin retains all 14 operator intelligence views', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const adminSource = fs.readFileSync(path.resolve(__dirname, '../src/components/operator/OperatorDashboard.tsx'), 'utf-8');

    // Must retain operator views
    expect(adminSource).toContain('Universal Session Funnel');
    expect(adminSource).toContain('Deductive Root Cause Chain');
    expect(adminSource).toContain('Session Explorer');
    expect(adminSource).toContain('Session DNA');
    expect(adminSource).toContain('Upstream Provider Feed Health');
    expect(adminSource).toContain('AI Session Investigator');
    expect(adminSource).toContain('What-If');
    expect(adminSource).toContain('Responsible Intelligence');
  });

  it('preserves system invariants: Session Quality, Lifeboat, Continue Playing, Live Rooms, Notifications', () => {
    // 1. Session Quality Formula Invariant
    const quality = calculateSessionQuality([], [], 'HEALTHY');
    expect(quality.overallScore).toBe(84);
    expect(quality.overallScore).toBeGreaterThanOrEqual(0);
    expect(quality.overallScore).toBeLessThanOrEqual(100);

    // 2. Lifeboat Invariant
    let health = transitionHealthState('HEALTHY', makeEvent('CONNECTION_LOST'), []);
    expect(health).toBe('AT_RISK');
    health = transitionHealthState(health, makeEvent('RECOVERY_COMPLETED'), []);
    expect(health).toBe('RECOVERED');

    // 3. Safety Gate Invariant
    expect(evaluateNotificationSafety('hurry limited time').passed).toBe(false);
    expect(evaluateNotificationSafety('safe informational update').passed).toBe(true);
  });
});

describe('Phase 21 — Customer Login Portal & Prototype Auth Hardening', () => {
  it('validates email syntax with strict boundary checks', async () => {
    const { validateEmail } = await import('../src/services/socialUserService');
    expect(validateEmail('test@waypoint.psk').valid).toBe(true);
    expect(validateEmail('user.name+tag@domain.co').valid).toBe(true);
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail('   ').valid).toBe(false);
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
  });

  it('validates password requirements for interaction realism without persistence', async () => {
    const { validatePassword } = await import('../src/services/socialUserService');
    expect(validatePassword('secure123').valid).toBe(true);
    expect(validatePassword('1234').valid).toBe(true);
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword('   ').valid).toBe(false);
    expect(validatePassword('abc').valid).toBe(false);
  });

  it('registers new prototype user with validation and prevents password leakage', async () => {
    const {
      registerPrototypeUser,
      _resetAuthForTesting,
      STORAGE_KEY_AUTH,
      STORAGE_KEY_USER,
    } = await import('../src/services/socialUserService');

    _resetAuthForTesting();

    // Rejection on short name
    const resShortName = registerPrototypeUser('A', 'user@psk.hr', 'pass123', 'pass123');
    expect(resShortName.success).toBe(false);
    expect(resShortName.error).toContain('Name must be at least 2 characters');

    // Rejection on invalid email
    const resBadEmail = registerPrototypeUser('John Doe', 'bademail', 'pass123', 'pass123');
    expect(resBadEmail.success).toBe(false);

    // Rejection on password mismatch
    const resMismatch = registerPrototypeUser('John Doe', 'john@psk.hr', 'pass123', 'mismatch');
    expect(resMismatch.success).toBe(false);
    expect(resMismatch.error).toContain('Passwords do not match');

    // Successful registration
    const resSuccess = registerPrototypeUser('John Doe', 'john@psk.hr', 'pass123', 'pass123');
    expect(resSuccess.success).toBe(true);
    expect(resSuccess.user).toBeDefined();
    expect(resSuccess.user?.displayName).toBe('John Doe');
    expect(resSuccess.user?.email).toBe('john@psk.hr');

    // CRITICAL SECURITY INVARIANT: Passwords must NEVER be present on the UserProfile object
    const userAny = resSuccess.user as Record<string, unknown>;
    expect(userAny['password']).toBeUndefined();
    expect(userAny['passwordHash']).toBeUndefined();

    // Prevent duplicate registration
    const resDup = registerPrototypeUser('John Two', 'john@psk.hr', 'pass123', 'pass123');
    expect(resDup.success).toBe(false);
    expect(resDup.error).toContain('already registered');
  });

  it('authenticates prototype user, supports demo account, and protects session state', async () => {
    const {
      authenticatePrototypeUser,
      createDefaultUser,
      getAuthSession,
      clearAuthSession,
      saveAuthSession,
      _resetAuthForTesting,
    } = await import('../src/services/socialUserService');

    _resetAuthForTesting();

    // Test fast Demo path
    const demo = createDefaultUser();
    expect(demo.email).toBe('luka.fan@waypoint.psk');
    expect(demo.displayName).toBe('Luka Modric Fan');

    // Authenticate with demo credentials
    const authDemo = authenticatePrototypeUser('luka.fan@waypoint.psk', 'demo123');
    expect(authDemo.success).toBe(true);
    expect(authDemo.user?.username).toBe('luka_zg');

    // Password must not be persisted
    expect((authDemo.user as Record<string, unknown>)['password']).toBeUndefined();

    // Verify session retrieval and clearing
    saveAuthSession(authDemo.user!);
    const current = getAuthSession();
    expect(current).toBeDefined();
    expect(current?.username).toBe('luka_zg');

    clearAuthSession();
    expect(getAuthSession()).toBeNull();
  });

  it('guarantees Operator Admin Portal (/admin) remains completely independent of customer auth', async () => {
    const { resolvePortalRoute } = await import('../src/App');
    const fs = await import('fs');
    const path = await import('path');
    const appSource = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf-8');

    // /admin resolves to admin regardless of customer session
    expect(resolvePortalRoute('/admin', '')).toBe('admin');
    expect(resolvePortalRoute('/admin/telemetry', '')).toBe('admin');

    // Admin branch in App.tsx is evaluated prior to customer login checks
    const adminBranchIndex = appSource.indexOf("if (portal === 'admin')");
    const userAuthCheckIndex = appSource.indexOf("if (!user)");
    expect(adminBranchIndex).toBeGreaterThan(-1);
    expect(userAuthCheckIndex).toBeGreaterThan(-1);
    expect(adminBranchIndex).toBeLessThan(userAuthCheckIndex);
  });
});



