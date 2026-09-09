# WAYPOINT — COMPLIANCE NOTE

**FEG Innovation Hackathon 2026 | Challenge 1 — Session Quality & Session-to-Action Conversion**

## The principle

WAYPOINT is built to **remove unnecessary friction from a session, not to manufacture gambling pressure**.

The product is designed around a simple distinction:

> **We optimise the session, not the customer's gambling intensity.**

WAYPOINT detects where a session is breaking, understands why it is breaking, and helps the customer continue naturally when they already have legitimate intent — or stop safely when they should.

This prototype uses synthetic/demo data and deterministic decision logic. It is **not a production gambling system or legal compliance implementation**. Any production deployment would require jurisdiction-specific legal, privacy, security and Responsible Gambling review.

## EU baseline

### GDPR

WAYPOINT follows a **privacy-by-design and data-minimisation approach**.

The core principles are:

* collect only what is required for the session-intelligence purpose;
* use data for a defined purpose;
* minimise personal data wherever possible;
* retain data only for as long as required;
* protect data through appropriate technical and organisational controls;
* maintain accountability and auditability.

These principles are consistent with the European Commission's GDPR guidance on purpose limitation, data minimisation, storage limitation, security and accountability.

The prototype therefore avoids real customer personal data and uses synthetic/demo session data. In production, the operator would need to establish the appropriate lawful basis, transparency, retention, access controls and safeguards for any profiling or automated decision-making involving personal data.

### ePrivacy

Session telemetry, cookies, local storage and similar technologies would be assessed against the applicable ePrivacy requirements and national implementation before production use.

The rule is simple: **do not collect or retain data just because the system can.**

### AI and automated decisioning

WAYPOINT's core session decisions are deterministic in this prototype.

AI is not given the job of deciding how aggressively a customer should gamble. Future AI-assisted capabilities, such as session investigation or root-cause analysis, would require appropriate risk assessment, transparency, governance and human oversight before production use.

The objective is **explainable session intelligence**, not a black-box system pushing customers towards more gambling.

### Accessibility

The customer experience should be designed and tested for accessibility, including keyboard navigation, readable interfaces, appropriate contrast, screen-reader compatibility and clear interaction states.

The EU accessibility baseline references **EN 301 549**, which closely follows WCAG 2.1 Level AA for relevant web accessibility requirements.

### AML / KYC / Identity

WAYPOINT does not replace or bypass operator controls for age verification, identity verification, KYC, AML, account restrictions or regulatory checks.

Those controls remain **upstream production requirements**.

WAYPOINT operates on top of an eligible customer/session context and does not attempt to override those controls.

---

# Responsible Gambling by Design

Responsible Gambling is **not an extra filter added at the end of the product**.

It is a constraint inside the decision layer.

WAYPOINT therefore explicitly avoids:

* dark patterns;
* artificial urgency;
* loss-chasing prompts;
* stake escalation;
* gambling-frequency pressure;
* emotional or vulnerability-based targeting;
* recommendations designed to increase gambling intensity;
* interventions that attempt to override self-exclusion or other Responsible Gambling restrictions;
* unsafe automatic retries or duplicate actions.

EU-level Commission guidance on online gambling has specifically addressed consumer protection, prevention of minors gambling, responsible-gambling information, time-outs and self-exclusion. The 2014 Commission Recommendation is a **recommendation rather than a single binding EU-wide gambling law**, so production implementation must follow the applicable national gambling rules and licence conditions.

## WAYPOINT safeguards

**1. Responsible Gate**
Potential interventions are checked against Responsible Gambling constraints before they are shown.

**2. No vulnerability inference**
WAYPOINT does not attempt to infer emotional state, financial vulnerability or psychological susceptibility and then use that information to influence gambling behaviour.

**3. Self-exclusion comes first**
A Responsible Gambling restriction is never treated as a conversion problem to solve.

**4. Lifeboat protects actions**
When a connection fails after a customer has already initiated an action, WAYPOINT protects the pending action and reconciles the outcome after connection recovery.

> **No blind retry. No unsafe duplicate submission.**

**5. Session Memory is continuity, not pressure**
Continue Playing exists to restore legitimate interrupted context. It is not designed to create urgency or encourage a customer to keep gambling.

**6. Notifications are controlled**
Contextual notifications are based on non-sensitive interest signals and session context. Safety checks block urgency, loss-chasing and gambling-intensity cues.

---

# Production Gate

Before production deployment, WAYPOINT would require:

* jurisdiction-specific gambling-law and licence review;
* GDPR and ePrivacy assessment;
* DPIA / automated-decision assessment where applicable;
* security and access-control review;
* age and identity verification integration;
* AML/KYC integration;
* self-exclusion and Responsible Gambling integration;
* accessibility assessment;
* retention and deletion policies;
* audit and incident-management processes;
* human oversight for any future AI-driven capability.

## Final compliance principle

> **Reduce unnecessary friction — never manufacture gambling pressure.**

WAYPOINT's business objective is therefore not:

**“How do we make customers gamble more?”**

It is:

**“How do we stop the product from getting in the way of what the customer was already trying to do — while making sure the customer can always stop safely?”**
