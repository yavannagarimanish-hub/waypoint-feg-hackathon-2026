# WAYPOINT
## Session Intelligence & Recovery Platform

> **Team Name:** Team Waypoint (Setacore)  
> **Challenge:** FEG Innovation Hackathon 2026 — Challenge 1: Session Quality and Session-to-Action Conversion  
> **Live Production Demo:** [https://intelligent-psk.vercel.app](https://intelligent-psk.vercel.app)  
> **Operator Admin Portal:** [https://intelligent-psk.vercel.app/admin](https://intelligent-psk.vercel.app/admin)  

---

## 1. The Problem: The Silent Sportsbook Drop-Off Crisis

In online sportsbooks, high-intent customers frequently abandon sessions due to unexpected technical friction: sudden network dropouts during wager submission, live odds drift shock, complex betslip thrash, and accidental tab closures. 

Traditional platforms treat these drop-offs as silent churn or diagnose them hours later via post-hoc analytics dashboards. Players are left in limbo—wondering if their wager was placed, fearing double-charge risks if they retry—and operators lose high-intent turnover while incurring expensive customer support tickets.

---

## 2. The Solution: Waypoint

**Waypoint** is a client-authoritative **Session Intelligence and Recovery Platform** that transforms silent drop-offs into visible, resilient, and socially engaging user experiences. 

Operating under an architectural model of **Two Decoupled Portals powered by One Single Data Layer**, Waypoint continuously tracks session health in real time, shields in-flight transactions with an idempotent recovery buffer, restores returning customers directly to their interrupted context, and enables community engagement through event-anchored social match rooms.

---

## 3. Key Innovations

1. **Client-Authoritative Canonical Event Pipeline**: A strictly typed, monotonically sequenced event bus (`sequenceNumber`, zero passive event leaks) establishing a single source of truth for telemetry.
2. **Dual Orthogonal State Machines**: Decouples customer intent (**Journey Stage**: `DISCOVERY` → `EXPLORATION` → `DECISION` → `ACTION` → `COMPLETION`) from technical system health (**Health State**: `HEALTHY` → `FRICTION` → `AT_RISK` → `RECOVERING` → `RECOVERED`).
3. **Session Quality Index (SQI)**: A continuous, 5-factor mathematical score bounded in $[0, 100]$:
   $$\text{Session Quality} = \text{round}(0.20 \cdot \text{Relevance} + 0.15 \cdot \text{Informedness} + 0.35 \cdot \text{Friction} + 0.15 \cdot \text{Momentum} + 0.15 \cdot \text{Recovery})$$
4. **Idempotent Session Lifeboat**: Automatically buffers and locks in-flight wagers during network disruptions, reconciling the outcome upon reconnection with **zero risk of duplicate wagers or double billing**.
5. **Continue Playing (Primary Re-Entry)**: Prominent top-of-page experience when a returning user has a resumable session, restoring fixture context, betslip items, and room state in 1 click.
6. **Live Match Rooms & Social Predictions**: Event-anchored rooms with URL hash deep links (`#user?room=...`) for instant cross-device sharing, featuring non-monetary score predictions and participation-based leaderboards.
7. **Operator Radar & Grounded AI Investigator**: A separate Operator Portal (`/admin`) observing the live customer session in real time with 14 diagnostic views, including the Universal Funnel, Friction Root Cause Explorer, and What-If Resilience Simulator.

---

## 4. End-to-End User & Operator Journey

```
HIGH-INTENT SESSION ──► INTERRUPTION ──► INTELLIGENCE ──► PROTECTION ──► RECOVERY & RE-ENTRY
     (Discovery)       (Network Drop)   (Friction Engine)  (Lifeboat)       (Continue Playing)
```

1. **Discovery & Exploration**: Customer browses Premier League matches in the User Portal; Session GPS tracks journey progress.
2. **Social Engagement**: Customer opens England vs Croatia, creates the *"Champions Watch"* Live Room, and shares the instant deep link with friends.
3. **Decision & Slip Creation**: Customer selects match markets; betslip opens with active context.
4. **Friction Injection**: Customer places bet while connection drops (simulated via **"Cut Net"** chaos button).
5. **Session Lifeboat Protection**: Session health drops to `AT_RISK`. The Lifeboat banner locks the client idempotency key and isolates the pending transaction.
6. **Safe Reconciliation**: Network restores (**"Restore Net"**); Lifeboat safely reconciles ticket status without duplicate submission risk. Session health reaches `RECOVERED`.
7. **Continue Playing Re-Entry**: Tab closure and return demonstrates 1-click session restoration at the top of the User Portal.
8. **Live Operator Observation**: Operator switches to `/admin` to inspect the exact live session sequence, root cause diagnosis, and funnel drop-off analytics.

---

## 5. Technology Stack

- **Frontend Runtime**: React 19 (`^19.2.8`), React DOM (`^19.2.8`)
- **Language & Type System**: TypeScript 6 (`~6.0.2`)
- **Build Tool & Dev Server**: Vite 8 (`^8.2.2`)
- **Styling & Design System**: Tailwind CSS 4 (`^4.3.3`), `@tailwindcss/vite`
- **Iconography**: Lucide React (`^1.43.0`)
- **Testing Framework**: Vitest 5 (`^5.0.0`)
- **Code Quality**: Oxlint (`^1.79.0`)
- **Deployment**: Vercel (Production Edge)

---

## 6. Prerequisites & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/yavannagarimanish-hub/waypoint-feg-hackathon-2026.git
cd waypoint-feg-hackathon-2026

# Install dependencies
npm install
```

---

## 7. Environment Variables

Waypoint runs 100% self-contained as a client-side prototype. **No `.env` file or external API keys are required** to run or evaluate the project. 

An example template is provided in [`.env.example`](.env.example):
```bash
PORT=5173
VITE_APP_TITLE=WAYPOINT - Intelligent Sportsbook
VITE_DEMO_MODE=true
VITE_CHAOS_SIMULATION_ENABLED=true
```

---

## 8. Run & Build Instructions

```bash
# Start local development server (accessible at http://localhost:5173)
npm run dev

# Run automated test suite (112 tests)
npm test

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 9. Automated Testing

Waypoint maintains comprehensive automated test coverage with **112 / 112 passing unit and integration tests**:

```bash
npm test
```

Test coverage includes:
- Journey Stage & Health State transitions
- Session Quality 5-factor mathematical weighting
- Client-side idempotency and duplicate bet prevention
- Friction rules (connection loss, odds drift shock, cognitive thrash)
- Session Memory, Smart Start, and Continue Playing persistence
- Customer Context Layer (Recently Viewed, My Live Rooms, Session Activity)
- In-App Contextual Notification Engine & Responsible Intelligence Safety Gate
- Universal Funnel and Friction Root Cause operator diagnostics

---

## 10. Demo Instructions & Live Access

- **Public Production Demo**: [https://intelligent-psk.vercel.app](https://intelligent-psk.vercel.app)
- **User Portal**: [https://intelligent-psk.vercel.app/user](https://intelligent-psk.vercel.app/user)
- **Admin Portal**: [https://intelligent-psk.vercel.app/admin](https://intelligent-psk.vercel.app/admin)
- **Live Room Deep Link Example**: [https://intelligent-psk.vercel.app/#user?room=room_1](https://intelligent-psk.vercel.app/#user?room=room_1)

See [`demo/demo-video-link.md`](demo/demo-video-link.md) for the complete 11-minute timestamped demo script.

---

## 11. Disclosures & Ethics

### Responsible Intelligence & Safety
Waypoint's **Responsible Intelligence Safety Gate** strictly prohibits dark patterns and predatory persuasion:
- **No Urgency Pressure**: Hard-blocks countdown timers, *"act fast"*, *"hurry"*, or *"before odds expire"*.
- **No Betting Frequency Cues**: Hard-blocks repeat betting prompts (*"bet now"*, *"bet again"*, *"haven't bet today"*).
- **No Loss-Chasing Stimulation**: Hard-blocks prompts to recover losses or escalate stake size.
- **Zero Vulnerability Profiling**: Never infers emotional distress, addiction risk, or financial solvency.

### AI & Code Assistance Disclosure
In accordance with FEG Hackathon guidelines, development of this project utilized AI-assisted coding tools (Google DeepMind Antigravity / Gemini) for codebase scaffolding, architectural refactoring, component prototyping, and test suite generation under human architectural direction and verification. All algorithms, state machine designs, and business rules were designed specifically for this hackathon challenge.

### Third-Party Dependency Disclosure
All third-party libraries utilized are distributed under standard, commercial-friendly open-source licenses (MIT, Apache-2.0, ISC). Zero proprietary, tracking, or unlicensed libraries are present. See [`docs/dependencies.md`](docs/dependencies.md) for the complete itemized disclosure.

### Prototype Limitations
- **Client-Side Simulation**: All sports data, customer balances, match odds, and transactions are simulated in browser memory and `localStorage`.
- **No Real-Money Processing**: Does not integrate with live banking, payment gateways, or production FEG wagering backends.
- **Deterministic AI Investigator**: Operates on observable telemetry heuristics and carries the explicit disclaimer: *"Observed association — not causal proof."*

---

## 12. Links to Required Documentation

- 📋 [**Business & Customer Impact Case**](docs/impact-case.md) — Market impact, turnover protection, and quantifiable metrics.
- ⚖️ [**Regulatory & Compliance Note**](docs/compliance-note.md) — Responsible gambling alignment, UKGC/MGA principles, and safety gates.
- 🏗️ [**Technical Architecture Specification**](docs/architecture.md) — Deep-dive into state machines, canonical events, and data layer.
- 📦 [**Third-Party Dependency Disclosures**](docs/dependencies.md) — Full dependency list, versions, and licenses.
- 🔔 [**Contextual Notifications Architecture**](docs/notifications.md) — Safety gate, journey signals, and notification engine.
- 🎥 [**Demo Video & Walkthrough Script**](demo/demo-video-link.md) — 11-minute demo schedule and walkthrough.
- 📸 [**Demo Screenshots Catalog**](demo/screenshots/README.md) — Platform views and UI captures.
- 📊 [**Presentation Pitch Deck Outline**](demo/presentation/README.md) — 10-slide hackathon presentation deck.

---

## 13. License

MIT License — Copyright (c) 2026 Team Waypoint / FEG Innovation Hackathon 2026. See [LICENSE](LICENSE) for details.
