---
name: Forge & Flux
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#564334'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#897362'
  outline-variant: '#ddc1ae'
  surface-tint: '#904d00'
  primary: '#904d00'
  on-primary: '#ffffff'
  primary-container: '#ff8c00'
  on-primary-container: '#623200'
  inverse-primary: '#ffb77d'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#5f5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#aba9a9'
  on-tertiary-container: '#3e3e3e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a modern industrial hardware experience. It balances the raw utility of professional tools with the high-performance aesthetics of modern SaaS. The brand personality is **Professional, Reliable, Energetic, and Industrial**.

The visual style follows a **Corporate / Modern** approach with a high-contrast industrial edge. It utilizes heavy whitespace to ensure complex product specifications remain legible, while employing bold, high-impact color accents to drive user action. The emotional response should be one of "industrial strength" and "technical precision"—reassuring the customer that the tools they buy are as robust as the platform they use to purchase them.

## Colors
The palette is centered around **Industrial Orange**, a high-visibility hue that signals action and energy. **Amber** serves as a secondary accent for highlighting secondary features and promotional badges.

- **Primary (Industrial Orange):** Reserved for the most important calls to action, such as "Add to Cart" or "Proceed to Checkout."
- **Secondary (Amber):** Used for ratings, promotional banners, and highlighting "Best Seller" statuses.
- **Surface & Text (Deep Charcoal/Slate):** Deep Charcoal is used for primary headings and navigation elements to provide a grounded, heavy feel. Slate Gray is used for secondary body text and metadata.
- **Functional Colors:** Success, Error, and Warning colors follow a slightly more saturated profile to match the industrial intensity of the primary orange.

## Typography
This design system uses **Inter** exclusively to maintain a systematic, technical feel. The hierarchy is defined by extreme weight contrasts.

- **Headlines:** Utilize "Bold" (700) and "ExtraBold" (800) weights. Tight letter spacing on larger sizes creates a "heavy machinery" aesthetic.
- **Body Text:** Uses "Regular" (400) weight for maximum readability in long technical product descriptions.
- **Labels:** Small labels and badges use "Bold" or "Medium" weights, often with slight tracking (letter-spacing) and uppercase transformations to mimic industrial stamping or labeling.

## Layout & Spacing
The layout uses a **Fluid Grid** system based on a 4px baseline. 

- **Desktop:** 12-column grid with 24px gutters and 48px minimum side margins.
- **Tablet:** 8-column grid with 16px gutters and 24px margins.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.

Spacing should be generous between sections (using `2xl` or `3xl`) to prevent the UI from feeling cluttered, which is a common pitfall for hardware e-commerce sites. Inside product cards and components, use `md` (16px) as the default padding.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** supplemented by **Ambient Shadows**.

- **Level 0 (Flat):** Main background color (#FFFFFF).
- **Level 1 (Subtle):** Used for input fields and secondary containers. Uses a subtle 1px border (#E2E8F0) instead of a shadow.
- **Level 2 (Raised):** Used for product cards. Features a soft, diffused shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Overlay):** Used for dropdowns and tooltips. Features a more pronounced shadow: `0 8px 24px rgba(0, 0, 0, 0.10)`.
- **Level 4 (Modal):** Used for high-level dialogs. `0 16px 40px rgba(0, 0, 0, 0.15)`.

Background blurs are avoided to maintain the "solid" industrial feel. Shadows should always have a neutral or slightly slate-tinted grey to stay grounded.

## Shapes
The shape language is **Rounded**, utilizing an 8px base radius for most components. This softens the "aggressive" nature of industrial colors while maintaining a modern, user-friendly interface.

- **Standard Elements (Buttons, Inputs, Cards):** 8px (`0.5rem`).
- **Large Elements (Modals, Featured Sections):** 16px (`1rem`).
- **Badges & Tags:** Fully pill-shaped for immediate visual distinction from square-edged product technical data.

## Components
Consistent styling across the hardware catalog:

- **Primary Buttons:** Background: `#FF8C00`, Text: `#FFFFFF`, Weight: Bold. On hover, darken by 10%.
- **Secondary Buttons:** Background: Transparent, Border: 2px solid `#2D2D2D`, Text: `#2D2D2D`.
- **Product Cards:** Level 2 elevation, white background, 8px rounded corners. Image area should have a subtle grey fill (`#F8F9FA`) to ensure white products don't bleed into the background.
- **E-commerce Badges:**
    - **Best Seller:** Amber (#FFB800) background with Deep Charcoal text.
    - **Discount:** Error Red (#EF4444) background with White text.
    - **New Arrival:** Industrial Orange (#FF8C00) background with White text.
- **Input Fields:** 1px border (#CBD5E1), 8px radius. On focus, the border becomes 2px Industrial Orange.
- **Iconography:** Use 2px stroke weight for line icons. Icons should be functional and literal (e.g., a heavy-duty wrench for "Tools," a geometric cart for "Shopping").
- **Rating Stars:** Always use the Amber (#FFB800) color for filled states.