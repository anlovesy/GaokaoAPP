# DESIGN_SYSTEM

## Purpose

This document is the root source of truth for the visual and implementation standards of the Gaokao AI Advisor project.

The product must be built as:

- a premium AI advisory brand
- an international-grade digital product
- a guided experience, not a dashboard

The product must not feel like:

- an admin panel
- a domestic SaaS template
- an education information portal
- a back-office system

## Product Position

Product name:

- AI High School Admission Advisor
- AI Gaokao Strategy Consultant
- ZHIXU / 志序

Core promise:

- help students and families make high-stakes admission decisions with confidence

Brand references:

- Apple
- Federico Pian
- Linear
- Raycast
- Framer
- Vercel
- Stripe

Identity direction:

- Decision Orbit as the primary brand mark
- Quiet Strategy as the primary brand mood
- Deep navy, paper neutrals, and restrained coral as the core palette

## Non-Negotiables

- Keep API behavior unchanged.
- Keep database behavior unchanged.
- Keep business logic unchanged.
- Keep auth, AI, RAG, workflow, and permissions unchanged.
- Do not add explanatory product copy unless a screen already requires it for function.
- Do not redesign outside the approved specifications.

## Design Philosophy

- Less interface, more experience.
- Less text, more confidence.
- One screen, one focus.
- Motion supports judgment, not spectacle.
- Images carry emotion, typography carries authority.

## Scope

The design system governs:

- layout
- spacing
- typography
- color
- imagery
- component behavior
- motion
- implementation process

The design system applies to:

- `/`
- `/login`
- `/workspace`
- `/university`
- `/volunteer`
- `/advisor`
- `/history`
- `/profile`

## Product Architecture Boundaries

The system should be understood as two layers working together:

- experience layer
- business layer

The experience layer may change:

- layout
- spacing
- visual hierarchy
- motion
- image treatment
- component presentation

The business layer must remain stable:

- data flow
- auth
- request handling
- AI and RAG behavior
- recommendation logic
- persistence
- routing contracts unless explicitly approved

## Page Matrix

| Route | Role | Primary Focus | Primary Action | Functional Constraint |
| --- | --- | --- | --- | --- |
| `/` | Brand landing | trust and curiosity | start experience | keep product entry obvious |
| `/login` | Entry ritual | calm sign-in | sign in or try | auth flow unchanged |
| `/workspace` | Decision studio | recommendation workflow | generate or refine plan | preserve all workflow steps |
| `/university` | School dossier | school identity and fit | inspect and compare | preserve existing data presentation paths |
| `/volunteer` | Recommendation output | tiered scheme review | review, expand, decide | preserve recommendation grouping logic |
| `/advisor` | AI consultation | conversation focus | ask follow-up | preserve streaming and citations |
| `/history` | Archive | past decision records | revisit result | preserve history access and detail flow |
| `/profile` | Personal summary | candidate identity | edit or confirm | preserve profile editing behavior |

## Experience Principles

Each page must answer four questions clearly:

1. What is this page's single job?
2. What should the user look at first?
3. What single action matters most right now?
4. What information can wait until the user asks for it?

If a page cannot answer those questions, it is too dense.

## Information Density Rules

- Reduce visible UI by default.
- Move secondary information behind expansion, detail views, or progressive disclosure.
- Replace repeated chrome with whitespace where possible.
- Do not expose all metadata at once.
- Keep one dominant content plane per screen.

## Implementation Boundaries

Allowed refactors:

- DOM structure refactors that preserve function
- component extraction
- style system cleanup
- tokenization
- animation architecture cleanup
- responsive layout restructuring

Not allowed without explicit approval:

- route changes
- form field meaning changes
- API contract changes
- database schema changes
- permission changes
- recommendation logic changes

## Responsive Experience Standard

Every approved design must support:

- ultra-wide desktop `2560`
- desktop `1920`
- laptop `1440`
- mobile `430`
- mobile `390`

Responsive behavior must preserve:

- complete functional access
- correct scrolling behavior
- readable typography
- stable input behavior
- no overlap or clipped content

## Sprint Execution Standard

Each implementation Sprint must include:

1. targeted scope only
2. no silent expansion of scope
3. runnable local state
4. screenshots for requested breakpoints
5. preview output for review
6. stop and wait for approval

## Acceptance Checklist

The design system is satisfied only if:

- the screen no longer reads as dashboard UI
- the primary visual focus is obvious in under 3 seconds
- the interface can be used without reading long explanations
- typography and spacing do most of the hierarchy work
- motion improves clarity instead of adding noise
- desktop and mobile both preserve the same product value

## Document Map

- [BRAND_GUIDELINE.md](BRAND_GUIDELINE.md)
- [docs/ZHIXU_BRAND_GUIDELINE_v1.md](../ZHIXU_BRAND_GUIDELINE_v1.md)
- [docs/ZHIXU_LOGO_SYSTEM_DECISION_ORBIT_v1.md](../ZHIXU_LOGO_SYSTEM_DECISION_ORBIT_v1.md)
- [UI_SPEC.md](UI_SPEC.md)
- [MOTION_SPEC.md](MOTION_SPEC.md)
- [COMPONENT_SPEC.md](COMPONENT_SPEC.md)
- [TYPOGRAPHY.md](TYPOGRAPHY.md)
- [COLOR_SYSTEM.md](COLOR_SYSTEM.md)
- [SPACING_SYSTEM.md](SPACING_SYSTEM.md)
- [IMAGE_GUIDELINE.md](IMAGE_GUIDELINE.md)
- [CODEX_RULES.md](../../CODEX_RULES.md)

## Priority Order

If documents ever conflict, follow this order:

1. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
2. [BRAND_GUIDELINE.md](BRAND_GUIDELINE.md)
3. [UI_SPEC.md](UI_SPEC.md)
4. [MOTION_SPEC.md](MOTION_SPEC.md)
5. [COMPONENT_SPEC.md](COMPONENT_SPEC.md)
6. [TYPOGRAPHY.md](TYPOGRAPHY.md)
7. [COLOR_SYSTEM.md](COLOR_SYSTEM.md)
8. [SPACING_SYSTEM.md](SPACING_SYSTEM.md)
9. [IMAGE_GUIDELINE.md](IMAGE_GUIDELINE.md)
10. [CODEX_RULES.md](../../CODEX_RULES.md)

## Delivery Standard

Every future UI Sprint must:

- follow these documents exactly
- keep all functional behavior intact
- generate preview output before asking for confirmation
- stop after the Sprint and wait for approval

See:

- [CODEX_RULES.md](../../CODEX_RULES.md)
