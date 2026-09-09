# WAYPOINT — Automated Test Suite

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**

---

## 1. Test Suite Architecture

Waypoint maintains a comprehensive automated test suite guaranteeing deterministic behavior across session intelligence, friction detection, idempotency, customer context, responsible AI gates, and operator analytics.

### Test Suites
- **Session Intelligence & Recovery Suite (`src/services/sessionIntelligence.test.ts`)**:
  - Journey State Machine transitions (`DISCOVERY` → `EXPLORATION` → `DECISION` → `ACTION` → `COMPLETION`)
  - Health State Machine transitions (`HEALTHY` → `FRICTION` → `AT_RISK` → `RECOVERING` → `RECOVERED`)
  - Session Quality 5-factor mathematical weighting and $[0, 100]$ boundary clamping
  - Idempotency key generation and duplicate prevention
  - Friction rules (connection loss, odds drift shock, UI cognitive thrash)
  - Social score and participation leaderboards
  - Session Memory, Smart Start, and Continue Playing persistence
  - Customer Context Layer (Recently Viewed, My Live Rooms, Session Activity)
  - Contextual In-App Notification Engine & Responsible Intelligence Safety Gate
- **Operator Analytics & Diagnostics Suite (`src/services/operatorAnalytics.test.ts`)**:
  - Universal Funnel drop-off calculations
  - Friction Root Cause sequence mapping
  - Provider health simulation and latency metrics
  - Grounded AI Session Investigator heuristic integrity

---

## 2. Running Tests

```bash
# Execute all test suites
npm test

# Run tests in watch mode
npx vitest

# Run tests with UI reporter
npx vitest --ui
```

