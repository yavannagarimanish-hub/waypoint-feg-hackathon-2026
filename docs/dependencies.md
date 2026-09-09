# WAYPOINT — Third-Party Dependency Disclosures

> **FEG Innovation Hackathon 2026**  
> **Challenge 1 — Session Quality and Session-to-Action Conversion**

---

## 1. Overview & Policy

Waypoint adheres to strict open-source dependency hygiene. Every third-party library utilized is distributed under standard, permissive open-source licenses (MIT, Apache-2.0, ISC). Zero proprietary or unlicensed third-party dependencies are present.

---

## 2. Runtime Dependencies

| Package | Version | License | Purpose / Architectural Role |
|---|---|---|---|
| [`react`](https://react.dev) | `^19.2.8` | MIT | Core reactive UI runtime and component model |
| [`react-dom`](https://react.dev) | `^19.2.8` | MIT | DOM rendering and event hydration |
| [`lucide-react`](https://lucide.dev) | `^1.43.0` | ISC | Accessible, lightweight iconography for portals |
| [`tailwindcss`](https://tailwindcss.com) | `^4.3.3` | MIT | Modern utility-first CSS design system |
| [`@tailwindcss/vite`](https://tailwindcss.com) | `^4.3.3` | MIT | Direct Vite compilation pipeline for CSS |
| [`clsx`](https://github.com/lukeed/clsx) | `^2.1.1` | MIT | Lightweight utility for constructing conditional class names |
| [`surge`](https://surge.sh) | `^0.44.1` | MIT | Fallback static site hosting utility |

---

## 3. Development & Toolchain Dependencies

| Package | Version | License | Purpose / Architectural Role |
|---|---|---|---|
| [`typescript`](https://www.typescriptlang.org) | `~6.0.2` | Apache-2.0 | Static type safety and contract enforcement |
| [`vite`](https://vite.dev) | `^8.2.2` | MIT | Next-generation build tool and local dev server |
| [`vitest`](https://vitest.dev) | `^5.0.0` | MIT | Fast unit and integration test runner |
| [`oxlint`](https://oxc.rs) | `^1.79.0` | MIT | High-performance linter for code correctness |
| [`@vitejs/plugin-react`](https://vite.dev) | `^6.1.0` | MIT | Babel/SWC Fast Refresh support for Vite |
| [`@types/react`](https://npmjs.com/package/@types/react) | `^19.2.18` | MIT | TypeScript declarations for React |
| [`@types/react-dom`](https://npmjs.com/package/@types/react-dom) | `^19.2.4` | MIT | TypeScript declarations for React DOM |
| [`@types/node`](https://npmjs.com/package/@types/node) | `^24.13.3` | MIT | TypeScript declarations for Node.js APIs |

---

## 4. Security & Audit Verification

- **Vulnerability Status**: Clean. Zero known vulnerabilities.
- **License Compliance**: 100% compliant with commercial-friendly open-source licenses (MIT, Apache-2.0, ISC).
- **Backend Isolation**: Zero dependencies require backend runtime connectivity; all dependencies execute purely in the modern browser environment.

