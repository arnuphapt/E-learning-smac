---
name: E-learning-smac Design System
description: Nursing college LMS with unified Soft Claymorphism design across student, tutor, and instructor suites
colors:
  primary: "#0d6e8c"
  primary-hover: "#0a5063"
  primary-light: "#1084a7"
  primary-soft: "#e1eef1"
  neutral-bg: "#f1f5f9"
  neutral-fg: "#0f172a"
  muted: "#eef4f8"
  muted-fg: "#64748b"
  border: "#e2e8f0"
  border-strong: "#cbd5e1"
  success: "#1f7a4d"
  success-soft: "#e2f0e6"
  warning: "#b06a1f"
  warning-soft: "#f7ead4"
  danger: "#bb3a4a"
  danger-soft: "#f7e2e2"
  danger-text: "#7d1f2c"
  clay-card-bg: "#ffffff"
typography:
  display:
    fontFamily: "var(--font-noto-serif-thai), Georgia, serif"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "var(--font-plex-sans-thai), var(--font-plex-sans), sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "11px"
  lg: "12px"
  control: "13px"
  choice: "16px"
  header: "18px"
  card: "20px"
  pill: "9999px"
components:
  clay-card:
    backgroundColor: "{colors.clay-card-bg}"
    textColor: "{colors.neutral-fg}"
    rounded: "{rounded.card}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 18px"
---

# Design System

## Overview
E-learning-smac serves nursing college instructors and students. The platform adopts a unified **Soft Claymorphism** design system across all touchpoints (student courses, tutor practice, instructor dashboards, navigation shells, dialogs, and authentication). Soft Claymorphism emphasizes tactile calm, cushioned volume, and dual-lighting relief while preserving medical study legibility, high density, and WCAG AAA accessibility.

## Colors
- **Primary**: Deep teal `#0d6e8c` representing calm medical precision.
- **Backgrounds**: Soft porcelain canvas `#f1f5f9`.
- **Foregrounds**: High-contrast slate `#0f172a` ensuring WCAG AAA accessibility across all surfaces.
- **Accents**: Semantic soft pills for status (success `#1f7a4d`, warning `#b06a1f`, danger `#bb3a4a`).

## Typography
- **Headings & Accents**: Noto Serif Thai / Georgia for course and lesson titles.
- **Body & Labels**: IBM Plex Sans Thai / sans-serif for crystal-clear readability.
- **Numeric & Scores**: Tabular figures in score wells and countdown timer badges.

## Layout
- **Containers**: Responsive container with max-width bounding (`1200px`).
- **Exam Topology**: 2-column layout on desktop (question card flex-1, sticky navigator 240px right); stacks naturally on mobile.
- **Grid Systems**: 3-column responsive card grids for tutor practice sets.

## Elevation & Depth
Soft Claymorphism relies on a gentle dual-layer lighting model:
- **Clay Cards**: Diffuse drop shadow (`0 10px 24px -4px rgba(15,23,42,.06)`) paired with soft top-left inner highlight (`inset 2px 2px 4px rgba(255,255,255,.95)`) and lower inner shade (`inset -2px -2px 5px rgba(13,110,140,.05)`).
- **Clay Wells**: Sunken tactile pockets (`inset 2px 2px 6px rgba(15,23,42,.07), inset -2px -2px 5px rgba(255,255,255,.9)`) for counters, score displays, and icon containers.
- **Keycaps**: Tactile question navigator numbers that simulate physical keycaps with active and answered states.

## Shapes
- **Cards**: `20px` border-radius with cushioned contours.
- **Controls & Buttons**: `14px` border-radius.
- **Badges & Pills**: `9999px` full pill radius.

## Components
- `.clay-card`: Tactile content containers with optional interactive hover lift.
- `.clay-btn-primary`: Gradient teal clay buttons with pressed feedback.
- `.clay-btn-soft`: White clay pill buttons with primary text.
- `.clay-choice`: Interactive exam options with physical radio well.
- `.clay-keycap`: Question number navigator pills.
- `.clay-sticky-header`: Floating status bar during active exams.
- `.clay-progress`: Smooth rounded progress well and bar.

## Do's and Don'ts
- **Do**: Maintain body text contrast >= 4.5:1 on all clay surfaces.
- **Do**: Use `.clay-well` for inset elements (scores, counters, input containers).
- **Don't**: Use harsh zero-blur drop shadows or cartoonish high-displacement 3D.
- **Don't**: Nest clay cards inside clay cards; use `.clay-well` for sub-regions instead.
- **Don't**: Animate width or height directly; prefer opacity and transform transitions.

