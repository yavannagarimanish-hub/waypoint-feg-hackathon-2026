# WAYPOINT — Platform Runtime Configuration

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**

---

## 1. Configuration Overview

Waypoint is designed as a zero-dependency, self-contained client-side application. Runtime behaviors, timeouts, and storage parameters are deterministically declared in application services and can be tuned via configuration constants.

---

## 2. Core Platform Parameters

| Configuration Parameter | Default Value | File Reference | Description |
|---|---|---|---|
| **Session Quality Weights** | `0.20, 0.15, 0.35, 0.15, 0.15` | `src/services/sessionIntelligence.ts` | Weighting formula for Session Quality breakdown |
| **Idempotency Timeout** | `15,000 ms` | `src/services/sessionIntelligence.ts` | Window for offline wager receipt reconciliation |
| **Notification Storage Cap** | `10 items` | `src/services/notificationService.ts` | Max in-app notifications stored in `localStorage` |
| **Notification Dedup Window** | `120,000 ms` (2 min) | `src/services/notificationService.ts` | Deduplication window preventing rapid duplicate alerts |
| **Session Inactivity Threshold** | `300,000 ms` (5 min) | `src/services/sessionMemoryService.ts` | Threshold after which returning triggers Continue Playing |

---

## 3. Storage Keys

- `waypoint_session_memory`: Authoritative session memory snapshot.
- `waypoint_recently_viewed`: User fixture browsing history.
- `waypoint_user_rooms`: User's created and joined Live Match Rooms.
- `waypoint_session_activity`: Audit trail of session actions.
- `waypoint_notifications`: In-app contextual notifications.

