# WAYPOINT — Technical Architecture Specification

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**

---

## 1. Architectural Philosophy: Two Portals, One Data Layer

Waypoint is designed around a single client-authoritative data layer that powers two completely decoupled user experiences:
1. **User Portal (`/` or `/user`, `#user`)**: 100% customer-facing sportsbook experience with Session GPS, Continue Playing, Smart Start, Live Match Rooms, and Session Lifeboat.
2. **Admin Portal (`/admin`, `#admin`)**: Dedicated operator control center with live flight radar, funnel drop-off analytics, friction root cause explorer, grounded AI session investigator, and what-if resilience simulator.

```
                                 WAYPOINT DATA LAYER
                                          │
                      Canonical Event Pipeline + Unified Session State
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
             USER PORTAL                                  ADMIN PORTAL
          (/, /user, #user)                            (/admin, #admin)
   - Sportsbook Navigation & Feed              - Executive Radar & Live KPIs
   - Continue Playing (Primary Re-entry)       - Universal Funnel Analysis
   - Smart Start Recommendation Engine         - Friction Root Cause Chain
   - Customer Context Layer                    - Session DNA & Quality Breakdown
   - Interactive Betslip & Lifeboat Shield     - Live Customer Session Trace
   - Live Match Rooms & Predictions            - Grounded AI Session Investigator
   - In-App Contextual Notifications           - What-If Resilience Simulator
```

---

## 2. Canonical Event Pipeline (`src/types/canonical.ts`)

Every user interaction, technical disruption, and system transition emits a strictly typed, monotonically sequenced **Canonical Event**:
- **Monotonic Sequencing**: Sequential incrementing `sequenceNumber` guarantees deterministic auditability.
- **Payload Strictness**: Strongly typed interfaces for navigation (`SPORT_VIEWED`, `EVENT_VIEWED`), wagering (`BETSLIP_ADDED`, `ACTION_STARTED`), friction (`CONNECTION_LOST`, `ODDS_CHANGED`), recovery (`RECOVERY_STARTED`, `ACTION_CONFIRMED`), and notifications (`NOTIFICATION_SHOWN`, `NOTIFICATION_OPENED`).
- **Zero Passive Event Leakage**: Components emit events strictly upon explicit user interaction or definitive state transitions. Initial renders produce zero spurious events.

---

## 3. Dual Orthogonal State Machines

Waypoint decouples customer intent progression from technical system health:

### A. Journey State Machine
Reflects intent and purchase phase, entirely independent of network stability:
```
DISCOVERY ──► EXPLORATION ──► DECISION ──► ACTION ──► COMPLETION
```

### B. Health State Machine
Reflects technical session integrity and friction presence:
```
HEALTHY ──► FRICTION ──► AT_RISK ──► RECOVERING ──► RECOVERED
```
*Key Invariant:* When a network loss occurs during bet placement, the journey stage remains `ACTION`, while session health drops to `AT_RISK` and initiates the Session Lifeboat. Context is preserved.

---

## 4. Session Quality Formula

Session Quality is derived continuously across 5 orthogonal, bounded dimensions $[0, 100]$:

$$\text{Session Quality} = \text{round}(0.20 \cdot \text{Relevance} + 0.15 \cdot \text{Informedness} + 0.35 \cdot \text{Friction} + 0.15 \cdot \text{Momentum} + 0.15 \cdot \text{Recovery})$$

- **Relevance (20%)**: Depth of engagement with focused sports and markets.
- **Informedness (15%)**: Context richness (match stats viewed, head-to-head explored).
- **Friction (35%)**: Penalty deductions for connection loss, odds drift shock, or UI thrash.
- **Momentum (15%)**: Directional velocity towards decision or completion.
- **Recovery (15%)**: Resilience and state preservation following technical disruption.

---

## 5. Idempotent Session Lifeboat

When network connectivity fails or latency spikes during an in-flight wager:
1. **Idempotency Lock**: Client generates a unique `idempotencyKey` attached to the wager receipt.
2. **Offline Buffering**: Pending action is isolated in the local state buffer.
3. **Safe Reconciliation**: Upon reconnection, the Lifeboat verifies status with the server before settling, explicitly preventing blind retries and double charges.

---

## 6. Social Layer & Live Match Rooms

- **Custom Room Creation**: Users create private or public match rooms anchored to real fixtures.
- **Hash Deep Linking**: Deep links encode room state directly in URL hash (`#user?room=ROOM_ID`) for instant cross-device sharing.
- **Non-Monetary Social Predictions**: Users vote on match outcomes; leaderboards reward participation and accuracy rather than wager turnover.

---

## 7. Storage Architecture & Clean Reset

Five dedicated client storage keys manage persistent state:
1. `waypoint_session_memory`: Authoritative last active session snapshot for Continue Playing.
2. `waypoint_recently_viewed`: Recent fixtures history.
3. `waypoint_user_rooms`: User's created and joined rooms.
4. `waypoint_session_activity`: Audit trail of session actions.
5. `waypoint_notifications`: In-app contextual notifications (capped at 10 items).

*The "Reset Demo" control in the command bar cleanly purges all five keys simultaneously, restoring fresh state without stale contamination.*
 
