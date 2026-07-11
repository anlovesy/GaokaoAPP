# COMPONENT_SPEC

## Purpose

This document defines the component language of the product.

## Component Philosophy

- Components should disappear into the experience.
- Layout and typography should carry more weight than borders and boxes.
- Fewer components should do more work.

## General Rules

- Do not add components unless they support an existing product need.
- Do not introduce decorative badges, chips, and dividers by default.
- Do not use stacked card grids as a fallback composition.
- Do not equalize every panel visually.

## Core Component Types

### Hero

Use for:

- landing thesis
- page identity
- major page transition moments

Rules:

- one dominant title
- one short support line
- one primary action

### Panel

Use for:

- content grouping where semantic separation is necessary

Rules:

- soft surface treatment
- minimal visible framing
- no heavy dashboard borders

### Recommendation Card

Use for:

- school recommendations
- major recommendations
- tiered volunteer outputs

Rules:

- emphasize hierarchy through spacing and type
- support hover reveal and expansion
- avoid table-like structure by default

### Conversation Bubble

Use for:

- AI and user messages in advisor experience

Rules:

- visual distinction should be subtle
- reading comfort is more important than contrast tricks
- source cards and metadata are secondary

### Media Rail

Use for:

- school image walls
- floating university collections
- gallery moments

Rules:

- images need consistent cropping logic
- motion must be slow and premium

### Input Surface

Use for:

- login
- workspace filters
- advisor composer

Rules:

- strong clarity
- minimal decoration
- focus states are precise and restrained

## Button System

### Primary Button

Use for:

- the main decision on a screen

Rules:

- one primary action per focus area
- may use magnetic behavior on desktop

### Secondary Button

Use for:

- alternative but important actions

Rules:

- visually quieter than primary

### Ghost Button

Use for:

- tertiary actions
- utility links

Rules:

- never compete with primary CTA

## States

Every interactive component should define:

- default
- hover
- active
- focus-visible
- loading
- disabled
- success if applicable
- error if applicable

## Forbidden Patterns

- heavy KPI cards
- dense management tables as default reading view
- badge-overuse
- multi-layer nested cards
- ornamental separators with no structural role

