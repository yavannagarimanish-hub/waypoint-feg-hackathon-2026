# WAYPOINT — Regulatory & Compliance Note

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**

---

## 1. Compliance Statement & Philosophy

Waypoint is built under the foundational tenet that **session intelligence must protect, inform, and respect the customer**, never manipulate or exploit them. The platform strictly complies with European, UKGC, and MGA responsible gambling standards by eliminating friction-induced uncertainty without introducing persuasive or predatory mechanics.

---

## 2. Responsible Intelligence Hard Gates

Waypoint implements an automated **Responsible Intelligence Safety Gate** across all customer-facing touchpoints (Continue Playing, Smart Start, In-App Notifications):

### A. Prohibited Persuasion Mechanics
- **No Urgency or Countdown Pressure**: Prohibits language such as *"act fast"*, *"hurry"*, *"limited time"*, *"clock is ticking"*, or *"before odds disappear"*.
- **No Betting Frequency Cues**: Prohibits language urging repeat wagers, such as *"bet now"*, *"bet again"*, *"you haven't placed a bet today"*, or *"don't miss out"*.
- **Zero Loss-Chasing Stimulation**: Prohibits any suggestion to recover previous losses, double down, or escalate stake sizes (*"win it back"*, *"recover your losses"*, *"increase stake"*).

### B. Protection Over Persuasion
- **Session Lifeboat Purpose**: The Lifeboat exists solely to prevent duplicate wagers and protect the customer's intended state during sudden disconnects. It never auto-submits, never auto-retries, and only reconciles state upon confirmed network recovery.
- **Continue Playing Purpose**: Re-entry restores the user's navigational and analytical context (fixtures viewed, markets considered). It never urges immediate wagering upon return.

---

## 3. Privacy, Data Minimization & Non-Profiling Guarantees

Waypoint enforces strict data boundaries:
- **Zero Sensitive Profiling**: The system **never** attempts to infer:
  - Gambling vulnerability or addiction risk
  - Emotional distress, anger, or frustration
  - Financial wealth, creditworthiness, or net worth
  - Protected characteristics or personal identity attributes
- **Deterministic Technical Telemetry**: Telemetry is strictly confined to observable technical events: sequence numbers, network latency spikes, odds drift variances, UI navigation actions, and component errors.
- **Client-Authoritative & Ephemeral**: All session data in this prototype resides ephemerally in memory and browser `localStorage`. No personal data or player profiles are transmitted to external servers.

---

## 4. AI Investigator Grounding & Disclaimers

The **AI Session Investigator** in the Operator Admin Portal operates on deterministic diagnostic heuristics:
- **Causality Disclaimer**: Every report generated carries the explicit disclaimer:
  > *"Observed association — not causal proof."*
- **Auditability**: Every finding references explicit sequence numbers from the Canonical Event Bus, allowing operators to verify telemetry without hallucinated conclusions.

---

## 5. Summary Matrix of Regulatory Alignment

| Regulatory Requirement | Waypoint Implementation | Status |
|---|---|---|
| **Prevention of Unintended Bets** | Idempotency locking prevents duplicate bet placement on reconnection | **COMPLIANT** |
| **No Predatory Marketing** | Strict lexical safety filter blocks urgency and frequency triggers | **COMPLIANT** |
| **Fair & Transparent Odds** | Live odds drift shock detection alerts user and requests confirmation | **COMPLIANT** |
| **Consumer Data Protection (GDPR)** | Minimal, pseudonymized, client-side session telemetry | **COMPLIANT** |
| **Participation Over Turnover** | Social Leaderboards scored on non-monetary participation, not wager size | **COMPLIANT** |
 
