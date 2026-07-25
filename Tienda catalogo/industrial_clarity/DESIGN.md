---
name: Industrial Clarity
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#554334'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#887362'
  outline-variant: '#dbc2ae'
  surface-tint: '#8d4f00'
  primary: '#8d4f00'
  on-primary: '#ffffff'
  primary-container: '#f28c00'
  on-primary-container: '#5a3100'
  inverse-primary: '#ffb875'
  secondary: '#585e6c'
  on-secondary: '#ffffff'
  secondary-container: '#dde2f3'
  on-secondary-container: '#5e6473'
  tertiary: '#005db6'
  on-tertiary: '#ffffff'
  tertiary-container: '#6da6ff'
  on-tertiary-container: '#003a76'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc0'
  primary-fixed-dim: '#ffb875'
  on-primary-fixed: '#2d1600'
  on-primary-fixed-variant: '#6b3b00'
  secondary-fixed: '#dde2f3'
  secondary-fixed-dim: '#c1c6d7'
  on-secondary-fixed: '#161c27'
  on-secondary-fixed-variant: '#414754'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#a9c7ff'
  on-tertiary-fixed: '#001b3d'
  on-tertiary-fixed-variant: '#00468c'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.2'
  button-text:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  touch-target-min: 56px
  gutter: 24px
  container-max: 1280px
  section-padding: 64px
---

## Brand & Style

The design system is engineered for maximum legibility and functional reliability, catering specifically to an older demographic of DIY enthusiasts and professionals. The brand personality is "Industrial Bold"—it evokes the sturdy, dependable nature of high-quality power tools. 

The aesthetic leans into **High-Contrast Modernism**. It rejects subtle gradients and thin lines in favor of heavy strokes, massive hit areas, and a clear visual hierarchy. The emotional goal is to provide a sense of confidence and safety; users should feel that the interface is as easy to handle as a well-balanced hammer. Every interaction is intentional, avoiding "clever" UX patterns like hidden drawers or long-press actions in favor of explicit, labeled controls.

## Colors

The palette is built on a high-contrast foundation to ensure AAA accessibility for vision-impaired users. 

- **Primary (Safety Orange):** Used for primary actions and critical highlights. It provides an immediate "llamativo" focal point against darker backgrounds.
- **Secondary (Deep Charcoal):** Provides the structural weight. Used for headers, footers, and text to ensure a grounded, "industrial" feel.
- **Tertiary (Utility Blue):** Reserved for information links and secondary interactive elements to distinguish them from the main "buy" or "confirm" actions.
- **Surface & Background:** High-contrast off-whites and pure white are used to prevent eye strain while maintaining a crisp separation of elements.

## Typography

Typography prioritizes scale and weight. **Inter** is utilized for its exceptional legibility and high x-height, which aids reading on digital screens. 

- **Scale:** Minimum body text size is set to 18px to accommodate age-related presbyopia. 
- **Rhythm:** Line heights are generous (1.6 for body) to prevent lines from blurring together. 
- **Weight:** Headings use Extra Bold and Bold weights to create a clear "scan-path" for the user.
- **Labels:** All interactive labels use a 700 weight to ensure they are never mistaken for static content.

## Layout & Spacing

The layout follows a **Rigid Grid** philosophy. Content is organized in a 12-column grid on desktop and a single column on mobile to eliminate complexity.

- **Touch Targets:** A strict minimum of 56px for all interactive elements ensures accessibility for users with reduced motor precision.
- **Negative Space:** Large gutters (24px+) are used to clearly separate different categories of tools or product information.
- **Responsive Behavior:** On mobile, all cards and buttons expand to full width (100%) to provide the largest possible tap area. Elements do not "float" or overlap; they stack vertically in a logical sequence of importance.

## Elevation & Depth

This design system avoids subtle shadows and translucent effects which can be confusing or visually muddy. Instead, it uses **Bold Borders** and **High-Contrast Outlines** to define depth.

- **Stacking:** Elements use a 2px solid border (`#1A202C`) to define their boundaries.
- **State Changes:** Hover and active states are indicated by a dramatic color fill (e.g., a button filling with the primary orange) rather than a shadow change.
- **Depth:** Higher elevation is represented by "Offset Borders"—a secondary solid line behind an element that creates a 3D effect without the fuzziness of a blur.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a subtle "friendliness" to the interface while maintaining the rigid, architectural feel of an industrial tool shop.

- **Primary Elements:** Buttons and Input fields use a 4px (0.25rem) radius.
- **Product Cards:** Use an 8px (0.5rem) radius to separate them visually from more functional UI components.
- **Icons:** Must be thick-stroked (2px or 3px) and placed within rounded-square containers to increase their visual weight.

## Components

### Buttons
Buttons are the core of this design system. They must be massive.
- **Primary:** Orange background, black text, 56px minimum height. Must include an icon + text label (e.g., [Icon] Add to Cart).
- **Secondary:** White background, 3px solid black border, black text.

### Input Fields
Inputs must have a permanent visible label (no floating labels).
- **Style:** 2px solid border, 18px text.
- **Focus:** 4px orange outer glow to clearly indicate which field is active.

### Cards
Used for product listings. 
- **Style:** White background, 1px grey border. 
- **Mandatory:** The entire card should be clickable to navigate to the product, acting as one giant hit target.

### Checkboxes & Radios
Standard browser sizes are too small. These must be custom-rendered at a minimum of 32x32px with high-contrast checkmarks.

### Navigation
- **Top Bar:** Fixed at the top. No hamburger menus on desktop; use large, clearly labeled text links. 
- **Mobile Navigation:** Use a bottom-fixed tab bar with large icons and text labels for primary sections (Home, Search, Cart, Account).