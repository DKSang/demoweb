---
title: 'Design System for AI Speaking Lab'
status: 'final'
updated: '2026-06-27'
colors:
  bg: 'hsl(0, 0%, 0%)'
  text-primary: 'hsl(0, 0%, 100%)'
  text-secondary: 'rgba(255, 255, 255, 0.8)'
  text-muted: 'rgba(255, 255, 255, 0.5)'
  glass-border: 'rgba(255, 255, 255, 0.15)'
  glass-bg: 'rgba(255, 255, 255, 0.015)'
  glass-bg-strong: 'rgba(255, 255, 255, 0.03)'
  success: 'hsl(120, 100%, 75%)' # restricted colored accent for pronunciation matching
  error: 'hsl(0, 100%, 70%)' # restricted colored accent for pronunciation mismatch
typography:
  font-sans: '"Poppins", system-ui, -apple-system, sans-serif'
  font-serif: '"Source Serif 4", Georgia, serif'
rounded:
  large: '2rem'
  panel: '2.5rem'
  pill: '9999px'
---

# Brand & Style

The visual theme is a high-contrast, dark-grayscale, liquid-glass aesthetic. The layout is positioned over a fixed, full-screen, looping grayscale video background to maintain a premium digital agency style.

# Colors

- **Strict Grayscale**: All base UI elements use shades of black and white. No colorful overlays, links, or accents are allowed.
- **Status Indicators (Restricted Exception)**: 
  - Matched pronunciation words: Soft Green (`#86efac` or HSL 120, 100%, 75%)
  - Missed/mispronounced words: Soft Red (`#fca5a5` or HSL 0, 100%, 70%)

# Typography

- **Headings & Body**: `Poppins` (weights 300, 400, 500, 600, 700). 
- **Serif Accent**: `Source Serif 4` used *only* for italic/emphasized text inside headings to give a high-fashion, editorial contrast.
- **Terminal Logs & Code**: `JetBrains Mono` or similar system monospaced fonts for technical data readouts.

# Layout & Spacing

- **Panels**: The design uses rounded, full-height panels with padding of `1.5rem` to `2.5rem`.
- **Inner Margins**: Large spaces (`1.5rem` to `3rem`) separating content groups.

# Elevation & Depth

- **Liquid Glass (Tier 1)**:
  - Background: `rgba(255, 255, 255, 0.015)`
  - Backdrop Blur: `8px`
  - Border: Subtle gradient overlay (`rgba(255,255,255,0.45)` to transparent) handled via CSS mask
  - Box Shadow: Inset `0 1px 1px rgba(255, 255, 255, 0.1)`
- **Liquid Glass Strong (Tier 2)**:
  - Background: `rgba(255, 255, 255, 0.03)`
  - Backdrop Blur: `50px`
  - Border: Stronger gradient overlay (`rgba(255,255,255,0.5)` to transparent)
  - Box Shadow: Inset `0 1px 1px rgba(255, 255, 255, 0.15)`, offset drop shadow `4px 4px 4px rgba(0, 0, 0, 0.05)`

# Components
 
- **Tabs Toggle Bar**: A horizontal list of buttons styled with the `.liquid-glass` class. The active tab has a solid white pill or a `bg-white/10` background overlay.
- **Walkie-Talkie Button**: A large, circular, glowing grayscale button with `lucide` microphone icon that scales up (`scale-105`) on hover and pulse animation during recording.
- **Progression Status Bar**: A full-width header panel card styled with `.liquid-glass` displaying the active progression Day, active locked lesson name, and a series of 4 pill-shaped interactive task badges (Listen, Shadow, Speak, Quiz) that route users directly to their respective tabs.
- **Task Transition Guidance Cards**: Small inline alert blocks styled with a soft green transparent background (`rgba(134, 239, 172, 0.1)`) and border (`rgba(134, 239, 172, 0.2)`) that contain a text checkmark and a clear CTA button guiding the user to the next logical tab.
- **Day Completed Unlock Overlay Modal**: A full-screen overlay with a high-blur backdrop (`backdrop-blur-md`) and a centered card celebrating the day's completion, displaying a glowing accomplishment badge and a prominent white CTA button to proceed to the next day.

# Do's and Don'ts

- **DO** keep the background video visible at all times.
- **DO** use transitions (`transition-all duration-300`) on all interactive buttons.
- **DO** make task checklist items interactive buttons to act as secondary navigation.
- **DON'T** let users bypass the locked daily lesson. Manual lesson dropdowns must be replaced by Day lock badges.
- **DON'T** use any solid color backgrounds like raw blue or red. Everything must rely on transparent glass borders and grayscale colors.
