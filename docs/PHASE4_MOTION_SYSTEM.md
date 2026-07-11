# Phase 4 Motion System

## Objective

Build one unified motion language for the entire ZHIXU product.

Motion is not decoration.
Motion should explain:

- what the AI is thinking
- what the user just changed
- what deserves attention now
- how one page belongs to the same product family as another

The system rule is:

`motion supports meaning`

---

## Motion Principles

### 1. Calm

- movement must never feel noisy
- no exaggerated bounce by default
- the product should feel confident, not playful

### 2. Premium

- transitions should feel softened and intentional
- opacity, blur, glow, and depth should do more work than rotation gimmicks

### 3. Deliberate

- every motion should answer a reason
- no random floating or looping that does not communicate state

### 4. AI Native

- the system should feel alive
- paths, orbits, dots, pulses, and progressive reveals should suggest reasoning

---

## Timing System

Derived from the motion references and UI timing rules.

### Core Durations

- micro feedback: `100 - 180ms`
- hover / button: `150 - 220ms`
- card lift / focus bloom: `180 - 260ms`
- section reveal: `300 - 420ms`
- page transition: `360 - 520ms`
- modal / layer entrance: `220 - 320ms`
- AI loop / orbital cycle: `1600 - 3200ms`
- ambient background flow: `6000 - 12000ms`

### Core Easing

- quick feedback: `ease-out`
- standard UI transitions: `ease`
- page-level transitions: `ease-in-out`
- premium reveal: soft cubic-bezier close to `0.22, 1, 0.36, 1`
- orbital / ambient loops: `linear` or soft `ease-in-out`

### Distance Rules

- reveal Y offset: `16 - 24px`
- horizontal slide: `20 - 40px`
- scale-in start: `0.95 - 0.98`
- hover lift: `-4px to -8px`

---

## Motion Layers

### Layer 1. Global Motion

Used across all pages.

- page enter
- page exit
- section reveal
- navigation shrink / progress
- mouse glow

### Layer 2. Brand Motion

Used to reinforce ZHIXU identity.

- orbit rotation
- path drawing
- thinking dot drift
- glow pulse
- light sweep

### Layer 3. Interaction Motion

Used for feedback and usability.

- hover lift
- button magnetic response
- input focus bloom
- timeline expansion
- card reveal

### Layer 4. Ambient Motion

Used to give the product life without disrupting reading.

- gradient flow
- particle drift
- soft background motion
- low-contrast light movement

---

## Shared Motion Vocabulary

All product pages should reuse these motion words:

- `Orbit`: continuous, calm, cyclical movement
- `Path`: progressive reasoning or direction
- `Connection`: relationship revealed by linking motion
- `Decision`: emphasis, settle, and finality

---

## Global Motion Rules

### 1. Page Enter

Use:

- fade in
- slight slide up
- slight scale settle only on major surfaces

Purpose:

- establish calm arrival
- avoid hard cuts between premium pages

Spec:

- duration: `380ms`
- easing: `ease-out`
- transform: `translateY(20px) -> 0`
- opacity: `0 -> 1`

### 2. Page Exit

Use:

- subtle fade
- slight compression or downward drift

Purpose:

- keep transitions soft

Spec:

- duration: `240ms`
- opacity: `1 -> 0`
- transform: `0 -> translateY(10px)`

### 3. Section Reveal

Use:

- single reveal on viewport entry
- no repetitive flashing

Purpose:

- support editorial reading flow

Spec:

- duration: `320 - 420ms`
- offset: `20px`
- once only

### 4. Scroll Progress

Use:

- thin page progress bar or decision progress line

Purpose:

- communicate reading / decision advancement

### 5. Mouse Glow

Use:

- radial highlight under cursor for hero and premium surfaces

Purpose:

- create living depth
- reinforce high-end tactile feeling

---

## Component Motion Rules

### 1. Hero

Use:

- fade + slide reveal
- text stagger
- primary visual thesis enters last

Do not:

- animate every word independently
- overuse dramatic zooms

### 2. Orb

Use:

- breathing scale
- orbit ring rotation
- particle drift
- subtle glow pulse

Purpose:

- express active cognition

Spec:

- breathing cycle: `2.4s`
- scale range: `0.985 -> 1.015`
- ring rotation: `18s - 32s linear infinite`
- particle drift: `5s - 8s ease-in-out infinite`

### 3. Decision Path

Use:

- path drawing
- moving dot
- node highlight when active

Purpose:

- show progressive reasoning

Spec:

- initial draw: `1200 - 1800ms`
- dot travel: loop every `2200 - 3200ms`

### 4. Cards / Glass Planes

Use:

- hover lift
- surface glow increase
- image micro zoom

Spec:

- duration: `180 - 220ms`
- translateY: `-6px`
- scale: `1.01`

### 5. Buttons

Use:

- scale response
- magnetic attraction
- light sweep on primary CTA

Spec:

- hover: `180ms`
- press: `120ms`
- scale: `1 -> 1.02`

### 6. Timeline Nodes

Use:

- hover expansion
- node brighten
- metadata fade in

Spec:

- hover duration: `220ms`
- expansion should happen in place

### 7. Input

Use:

- focus bloom
- border glow
- send trigger pulse

Purpose:

- turn the input into part of the AI surface

---

## Page Motion Mapping

### Landing

Primary motion:

- floating university images
- mouse parallax
- path-based image trail
- hero text reveal
- ambient mesh / particle motion

Priority:

- emotional first impression

### Login

Primary motion:

- floating photo wall
- glass panel fade/scale in
- image parallax
- button magnetic hover

Priority:

- premium entry, not dashboard auth

### Workspace

Primary motion:

- decision universe path drawing
- insight reveal
- timeline progress
- orb breathing
- hover lift on decision nodes

Priority:

- active planning and guided analysis

### Volunteer

Primary motion:

- lane reveal
- sequence node hover expansion
- compare strip reveal
- assist rail focus glow

Priority:

- order and consequence

### University

Primary motion:

- hero image parallax
- dossier reveal
- fit status emphasis
- sequence impact strip reveal

Priority:

- judgment and fit

### Advisor

Primary motion:

- large orb breathing
- orbital rotation
- reasoning text reveal
- prompt deck lift
- input bloom

Priority:

- live intelligence

---

## Technology Mapping

### Lenis

Use for:

- global smooth scrolling
- scroll stability
- premium page feel

Do not use for:

- per-component animation logic

### GSAP

Use for:

- path drawing
- complex timelines
- orbit choreography
- premium hero sequencing

Do not use for:

- ordinary hover states

### Framer Motion

Use for:

- page transitions
- section reveal
- layout-aware component transitions
- hover / tap states
- orchestration inside React pages

### CSS / Tailwind Motion

Use for:

- micro-interactions
- hover transitions
- light sweep
- glow pulse
- reduced-motion fallbacks

### Canvas / requestAnimationFrame

Use for:

- lightweight particles
- cursor-responsive ambient layer

Only when necessary.

---

## Accessibility Rules

Every motion must support reduced motion.

### Reduced Motion Strategy

- remove non-essential loops
- replace path drawing with static visible states
- replace parallax with fixed composition
- keep only opacity transitions where needed

### Minimum Requirement

- support `prefers-reduced-motion: reduce`
- no required interaction should depend on motion to be understandable

---

## Performance Rules

### Animate Only

- `transform`
- `opacity`

Avoid animating:

- width
- height
- top / left
- margin / padding
- font-size
- border-width

### Additional Rules

- use `will-change` sparingly
- pause off-screen loops
- reduce animation intensity during heavy scroll
- isolate expensive animated sections when needed

---

## Motion Review Checklist

Before implementation is considered complete:

1. Does this motion explain state, hierarchy, or reasoning?
2. Is the motion consistent with Orbit / Path / Connection / Decision?
3. Is the duration calm and premium rather than noisy?
4. Does reduced-motion still preserve usability?
5. Does it avoid layout thrash and heavy paint?

---

## Exit Criteria

Phase 4 is complete when:

1. every page feels alive, but not overloaded
2. the AI visibly feels like it is thinking
3. motion is consistent across Landing, Workspace, Volunteer, University, and Advisor
4. there is a clear implementation map for Lenis, GSAP, Framer Motion, and CSS
