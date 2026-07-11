# UI_SPEC

## Purpose

This document defines the UI direction for all core pages while preserving existing product functions and data flow.

## Global UI Rules

- Remove dashboard composition patterns.
- Reduce visible card count by at least half where possible.
- Do not present all data at once.
- Each screen must have one dominant focal area.
- Use asymmetry, scale contrast, and spacing to define hierarchy.
- Prefer image, typography, and motion over borders and badges.

## Mapping To Current Front-End

These routes currently map to the following implementation files and should remain functionally intact while being visually rebuilt:

- `/` -> [LandingScreen.jsx](/D:/agent/study/GaokaoApp/apps/web/src/pages/landing/LandingScreen.jsx)
- `/login` -> [AuthScreen.jsx](/D:/agent/study/GaokaoApp/apps/web/src/pages/auth/AuthScreen.jsx)
- `/workspace` -> [DecisionWorkspaceScreen.jsx](/D:/agent/study/GaokaoApp/apps/web/src/pages/workspace/DecisionWorkspaceScreen.jsx)
- `/advisor` -> [AdvisorScreen.jsx](/D:/agent/study/GaokaoApp/apps/web/src/pages/advisor/AdvisorScreen.jsx)
- `/university` -> [UniversityScreen.jsx](/D:/agent/study/GaokaoApp/apps/web/src/pages/university/UniversityScreen.jsx)

Any visual rewrite must preserve the functional responsibilities already handled by those screens.

## Page Principles

Each screen should aim for:

- one hero
- one dominant visual zone
- one primary action

Avoid:

- repeated equal-weight columns
- dense grids of similar cards
- multi-panel admin layouts
- explanatory info boxes

## Landing

### Design Intent

Landing is a brand introduction, not a feature summary.

### Structure

- Hero with oversized thesis headline
- One short supporting sentence
- Primary CTA
- Floating campus and university visual system
- Scroll storytelling sections
- Final transition into product entry

### Layout Sketch

```text
+--------------------------------------------------------------+
| oversized thesis              floating university media      |
| short supporting line         layered motion field           |
| primary CTA                                                |
+--------------------------------------------------------------+
| immersive scroll section with one idea per screen           |
+--------------------------------------------------------------+
| transition into product entry                               |
+--------------------------------------------------------------+
```

### Content Rules

- No long introduction blocks
- No platform explanation
- No workflow explanation
- No AI capability explanation

## Login

### Design Intent

Login is an entry ritual, not a management screen.

### Structure

- Left: immersive photo wall or motion-driven campus imagery
- Right: minimal authentication panel
- Minimal text
- Strong whitespace

### Layout Sketch

```text
+--------------------------------+-----------------------------+
| moving university imagery      | logo                        |
| drifting visual narrative      | account                     |
|                                | password                    |
|                                | primary auth action         |
|                                | secondary trial action      |
+--------------------------------+-----------------------------+
```

### Content Rules

- No product tutorial
- No account system explanation
- No user status copy unless required by auth flow

## Workspace

### Design Intent

Workspace is a decision studio, not a back-office console.

### Structure

- Preserve functional zones for profile, scheme, and assistant
- Rebalance layout to create primary and secondary reading order
- Default state should feel calm and sparse

### Layout Sketch

```text
+----------------+--------------------------------+----------------+
| profile summary | main recommendation canvas    | AI support     |
| compact first   | dominant reading surface      | secondary rail |
| expand on demand| actions and scheme output     | quick context  |
+----------------+--------------------------------+----------------+
```

### Content Rules

- Compress profile into concise summary by default
- Show details on demand
- Remove unnecessary labels and separators

### Functional Notes

- The recommendation area is the primary stage.
- Profile is contextual, not equal in weight.
- AI support is visible but should not visually overpower the scheme.

## University

### Design Intent

University pages should feel like curated dossiers, not data sheets.

### Structure

- Large hero image
- School identity first
- Data and details layered beneath
- Story-led image rhythm

### Layout Sketch

```text
+--------------------------------------------------------------+
| full-bleed hero media                                        |
| school name and essential identity                           |
+--------------------------------------------------------------+
| curated details               | supporting media or facts    |
+--------------------------------------------------------------+
```

## Volunteer

### Design Intent

Volunteer output should feel like premium recommendation storytelling.

### Structure

- Replace table feeling with sequential recommendation cards
- Emphasize reading flow over grid symmetry
- Keep tiers clear but not loud

### Layout Sketch

```text
+--------------------------------------------------------------+
| primary recommendation card                                  |
+--------------------------------------------------------------+
| sequential tier cards: chong / wen / bao                     |
| expandable details                                            |
+--------------------------------------------------------------+
```

## AI Advisor

### Design Intent

Advisor is a focused AI workspace, not customer support chat.

### Structure

- Dominant conversation canvas
- Fixed input at bottom
- Calm reading surface
- Source cards and thought states as refined accessories

### Layout Sketch

```text
+--------------------------------------------------------------+
| page header / context                                        |
+--------------------------------------------------------------+
| conversation canvas (scroll)                                 |
|                                                              |
|                                                              |
+--------------------------------------------------------------+
| fixed composer                                               |
+--------------------------------------------------------------+
```

## History

### Design Intent

History should feel like an archive of strategic decisions.

### Structure

- Timeline or grouped archive rhythm
- Calm list transitions
- Strong reading order

### Layout Sketch

```text
+--------------------------------------------------------------+
| archive heading                                              |
+--------------------------------------------------------------+
| grouped records with time rhythm                             |
| selected detail opens progressively                          |
+--------------------------------------------------------------+
```

## Profile

### Design Intent

Profile is a personal summary page, not a settings dump.

### Structure

- Summary first
- Detail second
- Edit states reveal progressively

### Layout Sketch

```text
+--------------------------------------------------------------+
| personal summary                                             |
+--------------------------------------------------------------+
| deeper fields and preferences                                |
| edit state expands locally                                   |
+--------------------------------------------------------------+
```

## Mobile Translation Rules

- Keep one dominant action visible without scrolling confusion.
- Convert multi-zone layouts into ordered vertical stacks.
- Preserve conversation and input anchoring on advisor.
- Preserve recommendation reading order on workspace and volunteer.
- Avoid dense collapses that hide critical functional controls.

## UI Acceptance Criteria

Each page passes UI review only if:

- the primary focus is immediately clear
- visible text is significantly reduced
- the page no longer feels like an admin surface
- the mobile layout preserves full task completion
- business actions are unchanged

## Responsive Standard

All page designs must be fully functional on:

- 2560
- 1920
- 1440
- 430
- 390

The mobile experience must preserve:

- complete feature access
- full workflow completion
- readable spacing
- fixed and scrollable regions that behave correctly
