---
name: Kinetic Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#bcc7de'
  on-secondary: '#263143'
  secondary-container: '#3e495d'
  on-secondary-container: '#aeb9d0'
  tertiary: '#b9c7e0'
  on-tertiary: '#233144'
  tertiary-container: '#8392a9'
  on-tertiary-container: '#1c2a3d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  surface-card: '#1e293b'
  surface-overlay: '#334155'
  border-subtle: '#334155'
  text-primary: '#f8fafc'
  text-secondary: '#94a3b8'
  status-success: '#10b981'
  status-warning: '#f59e0b'
  status-error: '#ef4444'
  status-info: '#0ea5e9'
  pizdo-purple: '#a855f7'
  lucidsales-teal: '#14b8a6'
typography:
  display-sm:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: normal
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: normal
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: normal
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: normal
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: normal
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-container: 24px
  sidebar-width: 260px
  sidebar-collapsed: 64px
  table-cell-padding: 8px 12px
---

## Brand & Style

This design system is a high-performance, high-contrast dark mode evolution of a developer-centric SaaS aesthetic. It is engineered for administrative power users who require long-duration focus and maximum data density without eye strain. 

The visual style is **Corporate / Modern** with a lean toward **Minimalism**, utilizing deep charcoal tones to create a focused "command center" environment. By replacing traditional light surfaces with stacked tonal grays and refined indigo accents, the UI evokes precision, technical sophistication, and reliability. The aesthetic avoids decorative elements, favoring structural clarity and high-contrast legibility to ensure that critical status indicators and data points remain the primary focus.

## Colors

The palette is optimized for a high-contrast dark environment, prioritizing accessibility and depth through tonal layering.

- **Backgrounds:** The core application background uses a deep charcoal (`#0f172a`). 
- **Surfaces:** Containers, cards, and sidebar elements use a slightly lighter slate (`#1e293b`) to create separation. Overlays and elevated surfaces use `#334155`.
- **Accents:** The primary Indigo is lightened to `#6366f1` to maintain vibrance and AA-level contrast against dark backgrounds.
- **Typography:** Headlines and primary body text use an off-white (`#f8fafc`) to reduce the "halo" effect often found with pure white text on black. Secondary metadata uses a muted slate-gray (`#94a3b8`).
- **Semantic Colors:** Status indicators utilize "container" logic—meaning badges use a low-opacity background (10-15%) paired with a bright, high-contrast foreground text of the same hue to ensure visibility without overwhelming the dark UI.

## Typography

The system utilizes a dual-font approach to balance readability with a technical aesthetic. 

**Inter** serves as the primary typeface for all functional text and headings, chosen for its exceptional legibility in dense data environments. **Geist** is reserved for metadata, labels, and small UI indicators to provide a distinct, developer-centric feel. For numerical data, financial figures, and IDs, **JetBrains Mono** is utilized to ensure tabular alignment and character distinction.

To maintain a high-density information environment, the majority of the interface should be set at the `body-md` (14px) level. Letter spacing is slightly increased for labels to ensure legibility against dark backgrounds.

## Layout & Spacing

The design system employs a **Fluid Grid** model that prioritizes horizontal space for complex data tables and dashboards.

- **Grid Strategy:** Content fills the available viewport width, bounded by a 24px margin on desktop. A fixed-width, collapsible sidebar resides on the left.
- **Rhythm:** A 4px base unit drives all spacing. For data-heavy views, use tight vertical spacing (8px or 12px) to maximize the amount of information visible on a single screen.
- **Responsive Behavior:** 
    - **Desktop (1280px+):** Full navigation and 24px page margins.
    - **Tablet (768px - 1279px):** Sidebar collapses to an icon-only rail (64px); margins reduce to 16px.
    - **Mobile:** Sidebar moves to a hidden drawer accessible via a top-bar hamburger menu; all layouts reflow to a single column.

## Elevation & Depth

In this dark mode system, depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows, which can appear muddy on dark backgrounds.

- **Layer 0 (Background):** The base level (`#0f172a`) represents the furthest plane.
- **Layer 1 (Card/Surface):** Primary containers use `#1e293b` with a subtle 1px border of `#334155`. This creates a crisp edge without the need for light-source shadows.
- **Layer 2 (Interactive/Hover):** Hover states are indicated by a shift to `#334155` or a primary Indigo glow.
- **Layer 3 (Modals/Overlays):** Elevated elements use the `#334155` surface and incorporate a **Backdrop Blur** (8px) on the content below. A very soft, dark shadow (0px 20px 25px black at 25% opacity) is used only here to provide a physical sense of separation for floating elements.

## Shapes

The shape language is **Soft**, favoring a professional and precise look over more consumer-oriented rounded styles. 

- **Standard Radius:** 4px (0.25rem) is used for buttons, input fields, and standard cards. 
- **Larger Radius:** 8px (0.5rem) is reserved for status badges or larger "hero" cards to provide a slight visual softening. 
- **Functional Sharpness:** Tab indicators and active state markers in the sidebar or tables use 0px radius on their outer edge to reinforce the grid-based, industrial nature of the admin interface.

## Components

### Buttons
Primary buttons use the indigo accent (`#6366f1`) with off-white text. Secondary buttons are "ghost" style with a 1px border of `#334155` and a subtle hover fill.

### Data Tables
Tables are the core of the system. Use sticky headers with a dark gray background. Rows should not use alternating colors (zebra stripes); instead, use a 1px border-bottom of `#1e293b` and a high-contrast hover state (`#334155`).

### Inputs & Form Fields
Input backgrounds use the `#0f172a` base color to create a "punched-in" effect against the `#1e293b` card surfaces. Use a 1px border that glows indigo (`#6366f1`) on focus.

### Status Badges
Badges use a "Container" style: a low-opacity version of the semantic color for the background and a full-vibrance version for the text. For example, a "Completed" badge has a 15% opacity green background and 100% opacity green text.

### Sidebar
The navigation uses a vertical layout with section headers in `label-md` (Geist). Active states are indicated by a 2px indigo vertical bar on the left edge and a subtle background highlight.

### KPI Cards
Key Performance Indicators use the `display-sm` font for primary values. If a metric is positive, the value may be colored with `status-success`. Each card should include a small, monochromatic sparkline to show trends without cluttering the UI.