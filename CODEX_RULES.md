# CODEX_RULES

## Purpose

This document defines how Codex must work on this project in all future design and front-end implementation sprints.

## Source of Truth

Before making any front-end change, Codex must follow:

1. [DESIGN_SYSTEM.md](/D:/agent/study/GaokaoApp/docs/design-system/DESIGN_SYSTEM.md)
2. [BRAND_GUIDELINE.md](/D:/agent/study/GaokaoApp/docs/design-system/BRAND_GUIDELINE.md)
3. [UI_SPEC.md](/D:/agent/study/GaokaoApp/docs/design-system/UI_SPEC.md)
4. [MOTION_SPEC.md](/D:/agent/study/GaokaoApp/docs/design-system/MOTION_SPEC.md)
5. [COMPONENT_SPEC.md](/D:/agent/study/GaokaoApp/docs/design-system/COMPONENT_SPEC.md)
6. [TYPOGRAPHY.md](/D:/agent/study/GaokaoApp/docs/design-system/TYPOGRAPHY.md)
7. [COLOR_SYSTEM.md](/D:/agent/study/GaokaoApp/docs/design-system/COLOR_SYSTEM.md)
8. [SPACING_SYSTEM.md](/D:/agent/study/GaokaoApp/docs/design-system/SPACING_SYSTEM.md)
9. [IMAGE_GUIDELINE.md](/D:/agent/study/GaokaoApp/docs/design-system/IMAGE_GUIDELINE.md)

## Absolute Constraints

Do not change:

- API contracts
- database logic
- business logic
- AI and RAG flow
- auth logic
- permissions
- workflow logic
- routes unless explicitly approved

## Design Constraints

Do not:

- revert to dashboard design
- add generic SaaS sections
- add explanatory product copy
- improvise a new design direction
- introduce unapproved fonts
- add components without need

Must:

- preserve the approved premium design language
- preserve functionality on desktop and mobile
- match the approved specs as closely as possible

## Sprint Process

Each Sprint must:

1. implement only the approved Sprint scope
2. keep the app runnable at all times
3. generate preview output before handoff
4. stop and wait for confirmation

Codex must not continue automatically after a Sprint is delivered.

## Required Validation Per Sprint

Before asking for confirmation, Codex must:

1. run the local dev environment if possible
2. generate preview pages or screenshots
3. provide local screenshots for:
   - Desktop `1440`
   - Desktop `1920`
   - Desktop `2560`
   - Mobile `390`
   - Mobile `430`
4. provide Lighthouse screenshots when requested in the Sprint
5. report any blockers honestly

## Engineering Rules

- Prefer reusable tokens over one-off styling.
- Keep motion logic centralized where possible.
- Avoid conflicting animation systems on the same element.
- Respect reduced motion.
- Maintain performance and layout stability.
- Do not introduce console warnings, lint errors, or hydration issues knowingly.

## Delivery Rules

Every delivery should include:

- changed files
- what was implemented
- what was validated
- what remains blocked or deferred

## If Specs and Existing Code Conflict

When the design specification conflicts with the current implementation:

- prioritize the approved specification
- preserve business behavior
- do not silently invent a compromise
