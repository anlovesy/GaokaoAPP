# MOTION_SPEC

## Purpose

This document defines the motion system for the Gaokao AI Advisor project.

Motion must support:

- focus
- confidence
- depth
- continuity

Motion must not create:

- noise
- distraction
- gimmicks

## Motion Stack

- `Lenis` for smooth scroll orchestration
- `GSAP` and `ScrollTrigger` for scroll storytelling, mask reveal, pinned sections, and layered parallax
- `Framer Motion` for page transitions, enter and exit states, hover behavior, local reveals, and presence management

## Responsibility Split

To avoid engineering conflicts:

- `Lenis` owns global scroll smoothing
- `GSAP` owns scroll-bound timelines
- `Framer Motion` owns component lifecycle and local interactive states

Do not let GSAP and Framer Motion control the same transform at the same time.

## Motion Character

- calm
- premium
- precise
- spatial
- editorial

## Duration Tokens

- `100ms` instant feedback
- `220ms` hover and small state transitions
- `320ms` standard component reveal
- `420ms` panel and content transition
- `600ms` major hero or section transition
- `1200ms - 3000ms` ambient motion

## Delay Tokens

- `0ms` immediate feedback
- `60ms` compact stagger
- `80ms` standard stagger
- `120ms` hero secondary layer delay
- `180ms - 240ms` layered scene entry offsets

## Ease Tokens

- `cubic-bezier(0.22, 1, 0.36, 1)` for primary reveal
- `cubic-bezier(0.4, 0, 1, 1)` for exits
- `linear` for drift, noise, or floating background motion

## Global Rules

- One dominant motion idea per screen.
- Favor opacity, transform, and mask over decorative movement.
- Avoid bounce-heavy motion.
- Avoid rotation-heavy motion.
- Avoid parallax on every element.
- Motion should feel guided, not playful.

## Global Patterns

### Page Enter

- opacity from `0` to `1`
- translateY from `20px` to `0`
- duration `420ms - 600ms`

### Page Exit

- opacity from `1` to `0`
- translateY from `0` to `-8px`
- duration `220ms - 320ms`

### Hover

- subtle lift
- optional soft glow
- duration `220ms`

### Button Press

- scale from `1` to `0.96`
- duration `100ms`

### Image Reveal

- mask or clip-path reveal
- optional scale from `1.04` to `1`
- duration `600ms`

### Stagger

- `60ms - 90ms` between siblings

### Loading

- typing dots `1200ms - 1500ms` loop
- skeleton shimmer `1500ms - 2000ms`
- ambient pulse `2000ms - 3000ms`

### Numeric Transition

- count-up `800ms - 1200ms`
- ease-out only
- use only on meaningful values

## Landing Motion

- Hero headline enters in layered sequence
- Floating university visuals drift slowly
- Cursor glow follows softly on desktop
- Storytelling sections reveal on scroll
- Images use mask reveal
- Parallax remains subtle

### Landing Timeline

1. background atmosphere establishes
2. first headline layer enters
3. second headline layer follows
4. support line reveals
5. CTA enters
6. media field floats in
7. scroll sections reveal one by one

## Login Motion

- Campus imagery loops slowly
- Auth panel rises in gently
- Focus states use light only
- Submit button morphs into loading state
- Success transition fades into next experience

### Login Timeline

1. media wall appears first
2. panel enters after short delay
3. inputs and actions reveal in compact stagger
4. loading morph on submit
5. success fade into next route

## Workspace Motion

- Functional zones enter in hierarchy
- Recommendation results reveal sequentially
- Key numbers animate smoothly
- Tab and view changes feel shared and continuous

### Workspace Timeline

1. shell appears
2. primary recommendation stage enters
3. secondary regions fade in
4. generated results reveal in sequence
5. filters and tabs update locally without page jitter

## University Motion

- Hero image reveals with mask
- Top image area uses light parallax
- Gallery transitions crossfade
- Important numeric data counts up only where meaningful

### University Timeline

1. hero media mask reveal
2. identity layer enters
3. detail sections reveal on scroll
4. gallery interactions remain soft and premium

## Volunteer Motion

- Recommendation cards reveal in reading order
- Details expand with height and opacity
- Hover uses restrained sheen, not loud 3D tricks

### Volunteer Timeline

1. primary recommendation enters
2. secondary tier cards follow
3. detail expansion occurs in-place
4. hover states remain subtle

## Advisor Motion

- Conversation canvas establishes first
- Input remains anchored
- AI thinking state uses dots, not harsh spinners
- Long answers reveal by chunk or paragraph
- Source cards enter separately at the end

### Advisor Timeline

1. shell and existing transcript appear
2. user send feedback confirms instantly
3. thinking state begins
4. answer streams by chunk
5. source cards reveal after answer body
6. scroll follows smoothly without jump

## History Motion

- Archive groups reveal progressively
- Timeline or date separators may draw in softly
- Detail drill-in uses shared transition when possible

### History Timeline

1. archive shell appears
2. grouped records reveal
3. timeline accents draw softly
4. selected detail transitions in place

## Profile Motion

- Summary first, details second
- Edit sections expand locally
- Save uses loading and success pulse with restraint

### Profile Timeline

1. summary enters
2. secondary detail modules follow
3. edit surfaces expand locally
4. save state confirms with soft success cue

## Ambient Effects

Allowed:

- dynamic gradient
- cursor glow
- floating image drift
- subtle light sweep
- soft glass reflection
- restrained particle atmosphere

Not allowed:

- fireworks
- aggressive glow pulses
- noisy full-screen particle storms

## Reduced Motion

Must support `prefers-reduced-motion: reduce`.

When reduced motion is enabled:

- disable parallax
- disable cursor glow
- disable magnetic interactions
- disable heavy ambient motion
- preserve only minimal fades and essential transitions

## Motion Acceptance Criteria

Motion passes review only if:

- it improves focus
- it does not make the product feel slower
- the screen remains readable during animation
- desktop motion feels premium, not playful
- mobile motion remains lighter but still coherent
- reduced-motion mode preserves usability
