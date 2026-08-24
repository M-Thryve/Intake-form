---
name: M-THRYVE Intake Form
description: Aurora design system for the M-THRYVE intake wizard and factory console.
colors:
  void: "#07080F"
  space: "#0A0B15"
  nebula: "#0E1120"
  cosmos: "#131628"
  rim: "#1B1F35"
  rim-mid: "#253040"
  teal: "#2DD4BF"
  violet: "#818CF8"
  pink: "#E879F9"
  cyan: "#22D3EE"
  amber: "#FBBF24"
  rose: "#FB7185"
  green: "#34D399"
  text-primary: "#F0F4FF"
  text-secondary: "#94A3C8"
  text-tertiary: "#5C6E8A"
  glass-bg: "rgba(14,17,32,0.7)"
  glass-border: "rgba(129,140,248,0.12)"
typography:
  display:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.02em"
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "0.1em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  xxl: "14px"
  pill: "100px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.void}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-disabled:
    backgroundColor: "{colors.cosmos}"
    textColor: "{colors.rim-mid}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-danger:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card-glass:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input-default:
    backgroundColor: "{colors.space}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

# Design System: M-THRYVE Intake Form

## Overview

**Creative North Star: "The Cosmic Control Room"**

Aurora is a deep-space visual system built for professional operator tooling. The interface sits inside a near-black cosmic void where teal and violet aurora light provides the only ambient color, creating an environment that feels like a mission control dashboard rather than a consumer form. Every surface uses glassmorphism over darkness, every accent is functional, and the atmosphere conveys that something serious and precise is happening behind the glass.

The system is dense and information-rich by design. Operators move through a multi-step wizard collecting client data, qualifying assets, selecting templates, and producing Build Cards. The visual density mirrors the task density: compact typography, tight spacing, monospaced system labels, and pill-shaped status indicators that scan quickly during a live discovery call. Aurora avoids decorative elements entirely; every pixel serves the operator's workflow.

The palette is anchored to a teal-to-violet accent spectrum. Teal (`#2DD4BF`) is the primary functional accent: active states, focus rings, progress indicators, and affirmative actions. Violet (`#818CF8`) provides secondary emphasis and glass-border luminance. Rose (`#FB7185`), amber (`#FBBF24`), and green (`#34D399`) serve strictly semantic roles (error, warning, success). The background layers from void (`#07080F`) through space (`#0A0B15`) to nebula (`#0E1120`), creating depth without shadows.

**Key Characteristics:**
- Deep cosmic void backgrounds (`#07080F` to `#0E1120`) with no pure black
- Teal (`#2DD4BF`) as the singular functional accent for active states and CTAs
- Glassmorphism on every elevated surface: `rgba(14,17,32,0.7)` + `blur(16px)` + violet-tinted border
- Monospaced uppercase labels (JetBrains Mono) for system metadata and step tags
- Ambient aurora glow via two radial gradients on the body
- No decorative color; every accent has a semantic purpose
- Two-font system: Inter for all content, JetBrains Mono for system labels

## Colors

The palette is a deep-space spectrum: six layers of near-black for surfaces, a teal-to-violet accent range for interaction, and semantic colors for status.

### Primary
- **Aurora Teal** (`#2DD4BF`): The primary functional accent. Used for active states, focus rings, progress bars, primary buttons, selected borders, the logo mark background, step tags, and the concierge border glow. Never used decoratively.
- **Aurora Violet** (`#818CF8`): Secondary accent for glass borders (`rgba(129,140,248,0.12)`), add-on status indicators, and subtle luminance on elevated surfaces.

### Tertiary
- **Fuchsia Pink** (`#E879F9`): Reserved for future use; defined but not actively applied in the current build.
- **Cyan** (`#22D3EE`): Used as an alternate color preset option. Not part of the core wizard UI.
- **Emerald Green** (`#34D399`): Success and available-status indicators.
- **Amber** (`#FBBF24`): Warning states, "provide later" status, inline validation borders, and caution callouts.
- **Rose** (`#FB7185`): Error states, required-field indicators, discard actions, destructive button backgrounds, and the "missing" asset status.

### Neutral
- **Void** (`#07080F`): Deepest background. The body's `background` property and the base layer everything sits on.
- **Space** (`#0A0B15`): Input field backgrounds, nested content areas, and the concierge panel header.
- **Nebula** (`#0E1120`): Card interiors, resource rows, selection buttons at rest, and the glass base color in `rgba(14,17,32,0.7)`.
- **Cosmos** (`#131628`): Divider lines, progress track background, and the disabled button surface.
- **Rim** (`#1B1F35`): Default borders on inputs, cards, buttons, and unselected states.
- **Rim Mid** (`#253040`): Disabled text, unselected option text, and placeholder-adjacent elements.
- **Primary Text** (`#F0F4FF`): All primary text, headings, selected-state labels, and high-emphasis content. A cool near-white, never pure `#FFFFFF`.
- **Secondary Text** (`#94A3C8`): Body copy, descriptions, hints, review labels, FAQ answers, and most paragraph text.
- **Tertiary Text** (`#5C6E8A`): Field labels, low-emphasis metadata, and the label style's default color.

### Named Rules
**The No Pure White Rule.** Primary text uses `#F0F4FF`, a cool-tinted near-white. Pure `#FFFFFF` never appears in the Aurora system. This maintains the cosmic atmosphere and reduces harsh contrast against deep backgrounds.

**The Functional Accent Rule.** Teal (`#2DD4BF`) appears only where it communicates state: selected, active, focused, affirmative, or in-progress. It is never applied as a background fill, decorative stripe, or ambient color.

## Typography

**Display & Body Font:** Inter (with `system-ui, sans-serif` fallback)
**System Label Font:** JetBrains Mono (with `monospace` fallback)

**Character:** Inter provides the clean, professional voice for all content, from hero headlines to form hints. JetBrains Mono appears exclusively in uppercase system labels, step tags, and status codes, creating a control-room register that separates metadata from human-readable content.

### Hierarchy
- **Display** (700, 46px, line-height 1.08, letter-spacing -0.035em): The intro hero headline only. Used once on the landing view for "Let's Build Your Software."
- **Heading** (700, 28px, line-height ~1.2, letter-spacing -0.025em): Step titles within the wizard. Each step has exactly one heading.
- **Subheading** (700, 22px): Modal titles and secondary headings within overlay panels.
- **Modal Title** (700, 18px): Confirmation modal headings (discard, tier change).
- **Body** (400-500, 14-15px, line-height 1.65): Step descriptions, FAQ answers, form hints, and paragraph content. The 15px size is used for step descriptions; 14px for inputs and general body.
- **Small Body** (400-600, 13px, line-height 1.45-1.65): Review row values, resource labels, operator spiels, concierge text, and FAQ questions.
- **Label** (500, 12px, letter-spacing 0.02em, color `#5C6E8A`): Field labels above inputs and textareas.
- **Small** (400-600, 11-12px): Hints, status text, footnotes, and secondary descriptions.
- **Mono Label** (400, 10px, JetBrains Mono, letter-spacing 0.1em, uppercase, color `#94A3C8`): Step tags ("Step 2 -- Client & Project Details"), section headers in review blocks, status codes ("REQUIRED"), and the concierge title bar metadata. When used as a step tag, the color shifts to teal (`#2DD4BF`) at 11px.
- **Micro Mono** (600-700, 9-10px, JetBrains Mono, letter-spacing 0.06-0.14em, uppercase): Inline system badges like "REQUIRED", "COMPANY DECK", operator spiel badges, and readiness labels.

### Named Rules
**The Two-Voice Rule.** Inter speaks to the operator as a professional peer. JetBrains Mono speaks as the system itself. These two voices never swap roles: content is always Inter, metadata is always JetBrains Mono uppercase.

## Layout

The wizard uses a single-column centered layout with a maximum width of 680px for form steps and 860px for the Build Card view. Content is padded at `52px` top and `28px` horizontal, with `160px` bottom padding to clear the floating concierge button.

The top navigation bar is 56px tall, sticky at the top with `z-index: 50`, and spans the full viewport width. Below it, a 2px progress track shows wizard completion in teal.

Form steps stack vertically with 16px gaps between fields. Two-column grids (`grid-template-columns: 1fr 1fr`, gap 16px) are used for paired fields like Full Name / Company and Email / Phone. Selection grids for project types use `repeat(4, 1fr)` with 8px gaps.

Modals are viewport-centered overlays (`position: fixed`, `inset: 0`) with max-width constraints of 480-520px and 28-32px internal padding.

The floating concierge sits at `bottom: 24px`, `right: 24px`, `z-index: 200`.

## Elevation & Depth

Aurora uses tonal layering and glassmorphism instead of traditional box shadows. Depth is conveyed through background opacity and backdrop blur, not drop shadows.

The only shadow in the system is on the concierge panel (`0 8px 40px rgba(0,0,0,0.6)`) and the concierge trigger button (`0 4px 20px rgba(45,212,191,0.2)`). All other elevation is achieved through glass layering.

### Tonal Depth Scale

| Level | Background | Use |
|-------|-----------|-----|
| Ground | `#07080F` (void) | Body background, the deepest layer |
| Recessed | `#0A0B15` (space) | Input fields, nested content, concierge header |
| Surface | `#0E1120` (nebula) | Resource rows, selection buttons at rest, card interiors |
| Glass | `rgba(14,17,32,0.7)` + `blur(16px)` | Cards, modals, concierge panel, review blocks |
| Top Bar | `rgba(7,8,15,0.85)` + `blur(16px)` | Sticky navigation bar |
| Overlay | `rgba(7,8,15,0.92-0.96)` | Modal backdrops, full-screen overlays |

### Named Rules
**The Glass-Over-Void Rule.** Elevated surfaces never use opaque backgrounds. Every surface above the ground layer uses a translucent background with `backdrop-filter: blur(16px)` so the ambient aurora glow bleeds through. This is what gives the interface its cosmic depth.

## Shapes

The form language uses rounded rectangles throughout, with radius increasing as surface importance grows. There are no sharp corners and no circles except for the concierge trigger button and the decorative dot separator.

### Radius Scale
- **Small** (6px): Logo mark, concierge close button, small utility elements
- **Standard** (8px): Inputs, small buttons, resource rows, version selectors, review sub-blocks
- **Comfortable** (10px): Intro feature cards, selection option buttons, operator spiel containers, review inner panels
- **Card** (12px): Glass cards, review blocks, main card containers
- **Modal** (14px): All modal dialogs (discard, tier warning, outcome overlay)
- **Concierge** (16px): The floating concierge panel
- **Pill** (100px): Readiness status pills, asset tags, status badges

### Border Language
Borders at rest use `1px solid #1B1F35` (rim). Selected states shift to `1px solid #2DD4BF` (teal). Destructive contexts use `1px solid rgba(251,113,133,0.28-0.35)` (translucent rose). Glass surfaces use `1px solid rgba(129,140,248,0.12)` (translucent violet). Warning validation uses `1px solid #FBBF24` or `1px solid rgba(251,191,36,0.45)`.

## Components

### Buttons

**Character:** Buttons are firm and decisive. Primary buttons are bold teal on void, ghost buttons are transparent with rim borders, and destructive buttons are opaque rose. All buttons use Inter at 14px weight 700 with tight letter-spacing (-0.01em).

- **Shape:** Uniformly rounded (8px radius)
- **Primary:** Teal background (`#2DD4BF`), void text (`#07080F`), padding `12px 24px`. Disabled state: cosmos background (`#131628`), rim-mid text (`#253040`), `cursor: not-allowed`.
- **Ghost:** Transparent background, rim border (`1px solid #1B1F35`), secondary text (`#94A3C8`), weight 500, padding `12px 20px`.
- **Danger (Discard Confirm):** Rose background (`#FB7185`), primary text (`#F0F4FF`), weight 700, padding `10px 18px`.
- **Danger Outline (Discard Trigger):** Transparent background, rose-tinted border (`1px solid rgba(251,113,133,0.28)`), rose text (`#FB7185`), weight 600, padding `6px 12px`, radius 7px, font size 12px.
- **Text Button (Edit):** No background, no border, teal text (`#2DD4BF`), 12px, no padding.
- **Transition:** `all 0.15s` on primary and ghost buttons.

### Cards / Containers (Glass Panels)

**Character:** Every elevated container is a glass panel that lets the aurora glow bleed through.

- **Corner Style:** Rounded (12px radius)
- **Background:** `rgba(14,17,32,0.7)` with `backdrop-filter: blur(16px)` and `-webkit-backdrop-filter: blur(16px)`
- **Border:** `1px solid rgba(129,140,248,0.12)` (violet-tinted glass border)
- **Internal Padding:** 20px
- **No shadow** -- depth comes from the translucent layering

### Inputs / Fields

- **Style:** Space background (`#0A0B15`), rim border (`1px solid #1B1F35`), 8px radius, 14px Inter text in primary text color (`#F0F4FF`), padding `12px 14px`.
- **Focus:** Border shifts to teal (`#2DD4BF`), with a double glow: `0 0 0 3px rgba(45,212,191,0.15), 0 0 20px rgba(45,212,191,0.08)`. Defined globally in index.css with `!important` to override inline styles.
- **Validation Warning:** Border shifts to amber (`1px solid #FBBF24`). Group-level warnings use an outline: `1px solid rgba(251,191,36,0.45)` with 10px radius.
- **Placeholder:** Color `#253040` (rim-mid), set via global `<style>` tag.
- **Select Dropdown:** Same input styling with `cursor: pointer`. Option backgrounds use `#0E1120` with `#F0F4FF` text.
- **Caret:** Teal (`#2DD4BF`), set globally for all inputs, textareas, and contenteditable elements.

### Selection Buttons (Project Type, Tier, Deck Options)

- **Style:** Nebula background (`#0E1120`) at rest, teal-tinted on selection (`rgba(45,212,191,0.06-0.08)`). Rim border at rest, teal border when selected. Radius 8-10px. Padding `12px 14px` to `14px 8px`.
- **Text:** Secondary text (`#94A3C8`) at rest, shifting to teal (`#2DD4BF`) or primary text (`#F0F4FF`) when selected. Weight shifts from 400 to 600.
- **Transition:** `all 0.15s`.

### Status Pills (Readiness Indicators)

- **Shape:** Full pill (100px radius), padding `3px 9px`, font size 10px
- **Available:** Teal border and text (`#2DD4BF`)
- **Missing:** Rose border and text (`#FB7185`)
- **Provide Later:** Amber border and text (`#FBBF24`)
- **Not Applicable:** Rim-mid border and text (`#253040`)
- **M-THRYVE Add-On:** Violet border and text (`#818CF8`)
- **Selected State:** Border matches status color, background uses status color at `18` hex opacity (roughly 9%)

### Navigation Bar

- **Style:** 56px height, full width, sticky at top, z-index 50.
- **Background:** Glass: `rgba(7,8,15,0.85)` with `backdrop-filter: blur(16px)`.
- **Border:** Bottom border `1px solid rgba(129,140,248,0.08)` (very faint violet).
- **Logo Mark:** 28x28px teal (`#2DD4BF`) rounded square (6px radius) with bold "M" in void (`#07080F`).
- **Brand Text:** "M-THRYVE" at 15px, weight 600, letter-spacing -0.01em.
- **Progress Bar:** 2px tall track below the nav bar. Background `#131628` (cosmos). Fill `#2DD4BF` (teal) with `transition: width 0.5s cubic-bezier(0.4,0,0.2,1)`.

### Modals

- **Backdrop:** Full-screen fixed overlay, `rgba(7,8,15,0.92)` for standard modals, `rgba(7,8,15,0.96)` for outcome overlays.
- **Panel:** Glass card at 14px radius, max-width 480-520px, padding 28-32px.
- **Glass:** Same formula as cards: `rgba(14,17,32,0.7)` + `blur(16px)`.
- **Border:** Violet glass border for neutral modals, rose-tinted border (`rgba(251,113,133,0.35)`) for destructive modals.
- **Actions:** Right-aligned button row with 10px gap. Ghost button for cancel, primary/danger button for confirm.

### Operator Spiel (Discovery Call Prompt)

- **Shape:** Rounded container (10px radius), padding `14px 16px`, margin-bottom 22px.
- **Layout:** Flex row with 12px gap. A JetBrains Mono uppercase badge ("Say to client") on the left, italic spiel text on the right.
- **Tones:** Default (teal-tinted), warning (amber-tinted), accent (violet-tinted). Each tone adjusts the border, background, and badge color.

### Floating AI Concierge

- **Trigger:** 56px circle button with void background (`#0A0B15`), 1.5px teal border, teal glow shadow (`0 4px 20px rgba(45,212,191,0.2)`). Contains the robot SVG icon.
- **Panel:** 360px wide glass card, max-height 520px, radius 16px, heavy shadow (`0 8px 40px rgba(0,0,0,0.6)`).
- **Header:** Space background (`#0A0B15`), robot icon, title in 13px bold, close button (28x28px, 6px radius, rim border).
- **FAQ Buttons:** Space background (`#0A0B15`), rim border, 8px radius, 13px secondary text, `transition: all 0.12s`.
- **Selected Question:** Teal-tinted background (`rgba(45,212,191,0.06)`), teal border, teal text.
- **Answer Bubble:** Space background (`#0A0B15`), 10px radius, robot icon alongside answer text.

## Do's and Don'ts

### Do:
- **Do** use the glass formula (`rgba(14,17,32,0.7)` + `blur(16px)` + `rgba(129,140,248,0.12)` border) for every elevated surface. Consistency is what makes the system feel intentional.
- **Do** use teal (`#2DD4BF`) only for interactive states: selected, active, focused, affirmative. Count of teal elements on screen should be low.
- **Do** use JetBrains Mono uppercase for system metadata labels (step tags, status codes, section headers in review). Never use it for content the operator reads at length.
- **Do** use `#F0F4FF` for primary text and `#94A3C8` for secondary text. These two colors handle 95% of text rendering.
- **Do** apply the semantic color strictly: rose for error/destructive, amber for warning/caution, green for success/available, violet for add-on/enhancement.
- **Do** keep input focus treatment consistent: teal border + double glow (`0 0 0 3px rgba(45,212,191,0.15), 0 0 20px rgba(45,212,191,0.08)`).

### Don't:
- **Don't** use opaque backgrounds on elevated surfaces. The translucent glass layering is core to Aurora's depth model.
- **Don't** use pure white (`#FFFFFF`) or pure black (`#000000`). The palette's darkest value is `#07080F` and lightest is `#F0F4FF`.
- **Don't** use teal decoratively as a background fill, stripe, or ambient color. It is exclusively functional.
- **Don't** introduce drop shadows for depth. Aurora uses tonal layering and glass blur. The only shadows are on the concierge panel and its trigger button.
- **Don't** use Inter for system labels or JetBrains Mono for body content. The two fonts have separate, non-overlapping roles.
- **Don't** apply Aurora tokens to the client portal. The portal (`/portal`) has its own independent light-mode design system with its own token set (`--portal-*`), separate typography, and teal-on-white surfaces.

## Scope

Aurora applies to the **intake wizard** (all steps from intro through Build Card) and the **factory console** (owner-gated decision interface). These surfaces share the same void background, glass cards, teal accent, and JetBrains Mono system labels.

The **client portal** (`/portal` route, rendered by `ClientPortal.tsx`) is a completely separate visual system. It uses a light background (`#f4f7f6`), dark ink text (`#102b31`), its own teal variant (`#39d6c7`), and a dark sidebar (`#11343a`). Portal tokens are scoped under the `.portal-app-shell` class and use `--portal-*` custom properties. Aurora tokens do not apply inside the portal, and portal tokens do not leak into the wizard.

### Browser Surface Theming (Aurora scope)

Defined globally in `index.css` for all Aurora surfaces:

- **Text selection:** Teal highlight (`rgba(45,212,191,0.25)`) with primary text color.
- **Caret color:** Teal (`#2DD4BF`) on all inputs, textareas, and contenteditable elements.
- **Input focus glow:** Teal border with double box-shadow, applied globally via CSS (excluding `.portal-input` elements).
- **Scrollbar:** Hidden on all elements (`scrollbar-width: none` and `::-webkit-scrollbar { display: none }`).

### Ambient Aurora Glow

The body carries two radial gradients that produce the faint aurora effect visible behind all content:

```css
background-image:
  radial-gradient(ellipse at 15% 85%, rgba(45,212,191,0.06) 0%, transparent 55%),
  radial-gradient(ellipse at 85% 15%, rgba(129,140,248,0.05) 0%, transparent 55%);
```

The first gradient places a faint teal glow in the bottom-left corner. The second places a faint violet glow in the top-right corner. Both are extremely subtle (5-6% opacity) and exist only to break the flat monotone of the void background. They are visible on large monitors; on smaller screens they blend into the darkness.
