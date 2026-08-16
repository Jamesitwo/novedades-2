---
name: Kinetic Admin
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e3'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2fc'
  surface-container: '#f0ecf6'
  surface-container-high: '#eae6f1'
  surface-container-highest: '#e4e1eb'
  on-surface: '#1b1b22'
  on-surface-variant: '#464553'
  inverse-surface: '#303037'
  inverse-on-surface: '#f3eff9'
  outline: '#777584'
  outline-variant: '#c8c4d5'
  surface-tint: '#544fc0'
  primary: '#1f108e'
  on-primary: '#ffffff'
  primary-container: '#3730a3'
  on-primary-container: '#a9a7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#511c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#752c00'
  on-tertiary-container: '#fe9562'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3b35a7'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb694'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7a3003'
  background: '#fcf8ff'
  on-background: '#1b1b22'
  surface-variant: '#e4e1eb'
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
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: jetbrainsMono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  sidebar-width: 260px
  sidebar-collapsed: 64px
---

## Brand & Style

The design system is engineered for high-performance back-office environments where data density and operational speed are paramount. The aesthetic draws from modern developer-centric SaaS tools, utilizing a **Corporate / Modern** style with a focus on functional minimalism. 

The UI should evoke a sense of precision, reliability, and technical sophistication. It prioritizes utility over decoration, using subtle borders and a refined monochromatic base to let critical data and status indicators stand out. The experience is designed to reduce cognitive load during long periods of use, supporting the complex workflows of administrative power users.

## Colors

This design system utilizes a structured color palette designed for high legibility in both light and dark modes.

### Brand Palette
- **Primary (Indigo-800):** Used for primary actions, active navigation states, and focused UI elements.
- **Secondary (Slate-900):** Used for sidebar backgrounds and high-contrast text.

### Status Palette (Semantic)
Colors are used strictly to communicate state. For accessibility, always pair these colors with a text label or icon.
- **Pending:** Amber/Yellow for caution or awaiting action.
- **In Process:** Sky Blue for active movement.
- **Completed:** Emerald Green for successful resolution.
- **Problem/Urgent:** Rose/Red for errors or high-priority blockers.
- **Cancelled:** Slate/Gray for inactive or voided items.

### Channel Accents
Specific brand colors for external channels ensure quick visual categorization:
- **Pizdo:** Purple-500.
- **LucidSales:** Teal-500.

### Theme Implementation
- **Light Mode:** Use White (`#FFFFFF`) for card surfaces and Slate-50 (`#F8FAFC`) for page backgrounds.
- **Dark Mode:** Use Slate-900 (`#0F172A`) for page backgrounds and Slate-800 (`#1E293B`) for surfaces. Use Slate-700 for borders.

## Typography

The typography system prioritizes scanability. **Inter** is the workhorse font, providing exceptional legibility for dense data tables. **Geist** is used for small labels and metadata to provide a technical, modern feel.

- **Scale:** Most administrative tasks should occur at the `body-md` (14px) or `body-sm` (13px) level to maximize information density.
- **Weight:** Use Semibold (600) for headers and Medium (500) for interactive labels.
- **Monospace:** Use **JetBrains Mono** for IDs, tracking numbers, and financial figures to ensure character alignment in tables.

## Layout & Spacing

The layout uses a **Fluid Grid** model with fixed-width functional sidebars. 

- **Sidebar:** A collapsible left-hand navigation. Grouped sections use 12px vertical spacing between items.
- **Data Density:** Use a tight spacing rhythm. Cell padding in tables should be `8px 12px` to allow for maximum row visibility.
- **Breakpoints:**
  - **Desktop (1280px+):** Full sidebar, 24px margins.
  - **Tablet (768px - 1279px):** Collapsed sidebar (icons only), 16px margins.
  - **Mobile:** Not prioritized, but layout should stack vertically with a top-bar navigation toggle.

## Elevation & Depth

This system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, flat aesthetic.

- **Level 0 (Background):** Base page color (Slate-50).
- **Level 1 (Surface):** White cards with a 1px border (Slate-200). No shadow.
- **Level 2 (Interactive):** Hover states on cards or rows should use a subtle background tint (Slate-100) rather than an elevation lift.
- **Level 3 (Overlay):** Drawers and modals. These use a 1px border and a very soft, large-radius shadow (`0 20px 25px -5px rgb(0 0 0 / 0.1)`) to separate from the background. Backdrop blur (8px) is applied to the page content beneath the modal.

## Shapes

The shape language is **Soft**. Small border radii communicate modern precision without the playfulness of fully rounded UI.

- **Standard Elements:** Buttons, inputs, and cards use `0.25rem` (4px).
- **Status Badges:** Use `rounded-lg` (8px) or "Pill" for high distinction.
- **Selection Indicators:** Vertical bars on the edge of active sidebar items or table rows use 0px radius for a "tab" feel.

## Components

### Data Tables
- **Header:** Sticky headers with Slate-50 background. 12px font size, uppercase, Medium weight.
- **Rows:** Zebra striping is avoided; use 1px bottom borders instead. Highlighting on hover is mandatory.
- **Filters:** Inline "pill" style filters above the table.

### Sidebar
- **Grouping:** Use subtle uppercase labels for section headers.
- **Active State:** Primary Indigo background for the icon or a 2px left-border accent.

### Status Badges
- **Style:** Subtle tinted background (10% opacity of the status color) with high-contrast text of the same hue.
- **Example:** A "Pending" badge has a light amber background and deep amber text.

### Kanban Boards
- **Columns:** Fixed width (280px). Slate-100 background.
- **Cards:** White background, 1px border. Drag-and-drop state should trigger a 2-degree tilt and a soft shadow.

### Slide-over Drawers
- **Position:** Anchored to the right side of the viewport.
- **Header:** Contains the Title, a Close button, and primary action buttons.
- **Content:** Scrollable area for deep-dive details.

### KPI Cards
- **Structure:** Large `display-sm` value, `label-md` title, and a 48px height sparkline using the primary or semantic color depending on the metric's health.