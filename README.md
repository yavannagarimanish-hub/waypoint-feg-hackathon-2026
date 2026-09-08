# WAYPOINT
## Session Intelligence & Recovery Platform

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**  
> *Transforming silent sportsbook drop-offs into visible, resilient, and socially engaging user experiences.*

---

## 1. Hackathon Challenge & Executive Summary
In online sportsbooks, high-intent customers frequently abandon sessions due to unexpected friction: sudden network dropouts during bet placement, live odds drift shock, complex multi-step slips, and cognitive thrash. Traditional platforms only detect these drop-offs hours later via post-hoc analytics dashboards.

**Waypoint** is a client-authoritative **Session Intelligence and Recovery Platform** that:
1. Continuously tracks session health, momentum, and friction in real time via a **Canonical Event Bus**.
2. Safeguards transactions during connection loss with an **Idempotent Session Lifeboat**, reconciling outcomes upon reconnection without duplicate retry risk.
3. Automatically offers **Continue Playing** re-entry when customers return to unfinished sessions.
4. Anchors customers around matches using event-anchored **Live Match Rooms** with shareable deep links and non-monetary social predictions.
5. Provides operators with a separate **Admin Portal** (`/admin`) observing the live customer session in real time alongside 14 diagnostic views (Funnel, Friction Root Causes, Session DNA, AI Investigator, What-If Simulator).

---

## 2. Architecture: Two Portals, One Data Layer

Waypoint strictly separates the **User Portal** (`/user`) from the **Admin Portal** (`/admin`), while both consume the exact same underlying canonical telemetry and session state:

```
                         WAYPOINT DATA LAYER
                                  │
                   Canonical Events + Session State
                                  │
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
      USER PORTAL                                ADMIN PORTAL
   (/ or /user, #user)                         (/admin, #admin)
  - Sportsbook IA & Fixtures Feed            - Executive KPIs & Flight Radar
  - Continue Playing (Primary Re-entry)      - Universal Funnel & Drop-Off Analyzer
  - Smart Start Recommendation Engine        - Friction Root Cause Chain
  - Recently Viewed & My Live Rooms          - Session Explorer & DNA Breakdown
  - Interactive Betslip & Lifeboat Shield    - Live Customer Session Timeline
  - Live Match Rooms & Predictions           - Grounded AI Session Investigator
  - Session Activity Timeline                - What-If Resilience Simulator
  - 100% Customer-Facing PSK UI              - Dedicated Operator Shell
```

---

## 3. Disclosures, Ethics & Prototype Limitations

- **Prototype Status**: This application is a fully client-side hackathon prototype designed for demonstration and evaluation.
- **Synthetic Data**: All customer identities, wagers, match statistics, odds, and session telemetry are local and synthetic. It is **not connected to production FEG systems**.
- **No Real-Money Integration**: All slips, odds, balances, and tickets are simulated in-memory and in browser storage. No real-money transaction or payment gateway integration exists.
- **Responsible Intelligence**: Waypoint never uses urgency cues, countdown pressure, or betting-frequency incentives ("bet again", "don't miss out"). Recovery exists solely to eliminate uncertainty and protect user state, not to stimulate turnover.
- **Grounded AI Investigator**: The prototype AI Session Investigator operates deterministically on observed session telemetry and is explicitly qualified with: *"Observed association — not causal proof."*
- **Production Readiness Path**: Production deployment would require integration with FEG backend services, authentic OAuth/KYC identity, hardened idempotency services, and appropriate regulatory compliance controls.

---

## 4. Setup & Local Development

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Execution
```bash
# Navigate to project directory
cd "c:/psk clone/intelligent-psk"

# Install dependencies
npm install

# Run automated tests (102/102 passing)
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 5. End-to-End Demo Script (10–12 Minutes)

| Time | Experience | Action & Story |
|---|---|---|
| **00:00 – 01:00** | Introduction | Problem statement: Silent drop-offs during high-intent wagering sessions. |
| **01:00 – 02:30** | User Portal (`/user`) | Browse football match offers, observe Session GPS tracking journey stages. |
| **02:30 – 04:00** | Live Match Room | Open `England vs Croatia`, create room `"Friday Football"`, demonstrate instant deep link. |
| **04:00 – 05:00** | Social Participation | Vote in match prediction, view Room Leaderboard (scored on participation, not wager size). |
| **05:00 – 06:30** | Chaos Injection | Add odds to slip, trigger bet placement, cut network via **Cut Net** chaos button. |
| **06:30 – 08:00** | Session Lifeboat | Observe `AT_RISK` health state and Session Lifeboat banner protecting the in-flight action. |
| **08:00 – 09:00** | Reconciliation | Connection restores; ticket reconciles safely with zero duplicate submission risk. |
| **09:00 – 10:00** | Continue Playing | Refresh/reopen page; demonstrate Continue Playing at the top restoring session context. |
| **10:00 – 12:00** | Admin Portal (`/admin`) | Switch to Admin; observe live customer session telemetry, Funnel, AI Investigator, and What-If simulator. |

---

## 6. License
MIT License — Copyright (c) 2026 Waypoint Authors / FEG Innovation Hackathon 2026.
