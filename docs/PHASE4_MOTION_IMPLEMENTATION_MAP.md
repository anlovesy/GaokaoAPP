# Phase 4 Motion Implementation Map

## Goal

Translate the motion language into implementation responsibilities.

This document is not changing code yet.
It defines which tool should own which motion behavior once development starts.

---

## 1. Lenis Layer

### Owns

- global smooth scroll
- scroll interpolation
- premium page movement baseline

### Pages

- Landing
- Login
- Workspace
- Volunteer
- University

### Notes

- should be global and consistent
- should not replace section reveal logic

---

## 2. GSAP Layer

### Owns

- decision path drawing
- orbital timelines
- hero reveal choreography
- advanced line / dot progression

### Best Fit Areas

- Landing hero
- Workspace decision universe
- Volunteer sequence emphasis
- Advisor orb chamber

### Why

GSAP is the best layer for sequenced timelines and curved-path orchestration.

---

## 3. Framer Motion Layer

### Owns

- route/page transitions
- section reveal
- hover / tap states
- component-level presence animations
- staggered editorial blocks

### Best Fit Areas

- all React page transitions
- Candidate Capsule
- insight blocks
- timeline node expansion
- prompt deck / button states

---

## 4. CSS Motion Layer

### Owns

- glow pulse
- light sweep
- simple hover transitions
- input bloom
- fallback loops
- reduced-motion overrides

### Best Fit Areas

- CTA buttons
- pills
- small cards
- subtle background glow

---

## 5. Canvas / RAF Layer

### Owns

- particles
- cursor glow field
- low-density ambient floating dust

### Best Fit Areas

- Landing
- Login
- Advisor orb space

### Constraint

- keep density low
- never block interaction

---

## Page-by-Page Mapping

### Landing

- Lenis: scroll baseline
- GSAP: hero sequencing, image trail path
- Framer Motion: content reveal
- CSS: CTA hover, glow
- Canvas: particles, cursor field

### Login

- Lenis: page feel if scroll exists
- GSAP: photo wall intro sequence
- Framer Motion: panel entrance
- CSS: glass shimmer, button hover
- Canvas: optional ambient dust

### Workspace

- Lenis: smooth vertical reading
- GSAP: decision universe path draw
- Framer Motion: insight sections, timeline expansion
- CSS: hover lift, focus bloom

### Volunteer

- Lenis: board movement
- GSAP: lane emphasis if needed
- Framer Motion: node expansion, compare strip reveal
- CSS: pills, action feedback

### University

- Lenis: soft dossier scroll
- GSAP: image parallax / sequence emphasis
- Framer Motion: fit modules reveal
- CSS: status glow, CTA motion

### Advisor

- Lenis: stable page feel
- GSAP: orb timelines, subtle chamber choreography
- Framer Motion: reasoning block reveal, prompt deck, input presence
- CSS: glow pulse and reduced-motion fallback
- Canvas: optional orbital particles

---

## Implementation Order

Recommended development order:

1. global scroll + reduced motion baseline
2. page transitions
3. hero and orb signature motion
4. timeline and decision-path motion
5. ambient motion
6. micro-interactions

---

## Risk Notes

### 1. Too Much Motion

Risk:

- premium design turns into visual noise

Control:

- one signature motion per page
- reduce secondary loops

### 2. Performance Drop

Risk:

- heavy blur, canvas density, or too many active loops

Control:

- only animate transform/opacity where possible
- pause off-screen loops

### 3. Brand Inconsistency

Risk:

- each page gets a different motion language

Control:

- all motion must map back to Orbit / Path / Connection / Decision

### 4. Chat-App Regression

Risk:

- Advisor becomes a standard message interface again

Control:

- keep Orb Chamber as the dominant animated identity
