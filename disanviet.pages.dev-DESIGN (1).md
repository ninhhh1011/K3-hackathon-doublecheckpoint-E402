# Design System Inspired by Viet Heritage AI

## 1. Visual Theme & Atmosphere

This design system embodies the serene elegance and cultural richness of Vietnamese heritage, blending warm earth tones with sophisticated restraint. The aesthetic draws inspiration from traditional Vietnamese architecture and natural landscapes—misty mountains, turquoise waters, and ancient temples—translated into a refined digital experience. The color palette emphasizes warm neutrals and muted golds, evoking heritage craftsmanship and timeless sophistication. Typography is classical and generous, with generous whitespace creating a contemplative, immersive atmosphere. The design prioritizes cultural storytelling through layered imagery, subtle depth, and restrained interactive elements that feel like natural extensions of the landscape rather than intrusive UI components.

**Key Characteristics**
- Warm, earthy color foundation with muted gold and taupe accents
- Classical, intentional typography with generous line spacing
- Subtle elevation and frosted glass effects for depth without visual noise
- Heritage-inspired decorative elements (Vietnamese motifs) integrated sparingly
- Immersive hero imagery with carefully balanced text overlays
- Interactive elements designed as subtle accessories to content
- Emphasis on legibility and contemplative pacing over visual density

## 2. Color Palette & Roles

### Primary
- **Dark Charcoal** (`#2D2820`): Primary text color, headings, and primary UI elements throughout the interface; most frequently used base tone
- **Deep Slate** (`#24383C`): Secondary dark tone for button backgrounds and high-contrast text layers

### Accent Colors
- **Heritage Gold** (`#9B7A3A`): Primary accent for highlights, selected states, and emphasis elements; bridges warmth and sophistication
- **Warm Taupe** (`#776F62`): Secondary accent for supporting headings, icons, and mid-tone accents
- **Soft Gold** (`#F6D99B`): Light accent for badge highlights and gentle emphasis on content containers
- **Earthy Brown** (`#6F5830`): Tertiary accent for borders, dividers, and tonal text on light backgrounds

### Interactive
- **Frost Glass** (`rgba(255, 255, 255, 0.1)`): Default button background with frosted transparency effect
- **Cream Glass** (`rgba(255, 255, 255, 0.88)`): Active/pressed button state with higher opacity
- **Translucent Light** (`rgba(255, 255, 255, 0.12)`): Secondary button backgrounds and pill-shaped link states
- **Warm White Text** (`rgba(255, 255, 255, 0.85)`): Primary interactive element text on dark/transparent backgrounds
- **Muted Gold Text** (`#F6D99B`): Highlighted link and accent text on semi-transparent surfaces

### Neutral Scale
- **Off-White** (`#FFFFFF`): Pure white for card backgrounds, containers, and clean surfaces
- **Cream Base** (`#FFFAF0`): Warm off-white for subtle background sections and body areas
- **Pale Beige** (`#F8F1E3`): Soft background for content zones with historical map or texture context
- **Very Light Gray** (`#F7F3EB`): Minimal use; reserved for very subtle surface differentiation
- **Light Gray** (`#E5E7EB`): Border colors, subtle dividers, and form element backgrounds
- **Cool Neutral** (`#CBD5D1`): Minimal use; muted border and outline tone

### Surface & Borders
- **Muted Border** (`#B8AA8D`): Borders, outlines, and subtle dividing lines; warm neutral tone
- **Form Stroke** (`rgb(229, 231, 235)`): Input borders, form element outlines

### Semantic / Status
- **Error Red** (`#B94D35`): Error states, invalid inputs, and critical alerts
- **Warning Gold** (`#C19A4B`): Warning states and cautionary messaging

## 3. Typography Rules

### Font Family
- **Primary**: UTM Horizon (serif, classical heritage aesthetic)
  - Fallback stack: `'UTM Horizon', Georgia, 'Times New Roman', serif`
- **Secondary**: TF Times New Normal (transitional serif for body and UI elements)
  - Fallback stack: `'TF Times New Normal', 'Times New Roman', Times, serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|-----------------|-------|
| Display / H1 | UTM Horizon | 72px | 400 | 72px | 0px | Hero headings; powerful presence |
| Heading 2 / H2 | UTM Horizon | 30px | 400 | 36px | 0px | Section titles; prominent content dividers |
| Heading 3 / H3 | UTM Horizon | 24px | 400 | 32px | 0px | Subsection headings; content hierarchies |
| Body / P | TF Times New Normal | 16px | 400 | 24px | 0px | Primary body text; content paragraphs |
| Navigation | TF Times New Normal | 14px | 500 | 20px | 0px | Header navigation links and menus |
| Button / Link | TF Times New Normal | 14px–16px | 400–500 | 20px–24px | 0px | Interactive element text |
| Caption / Label | TF Times New Normal | 12px | 400 | 18px | 0px | Form labels, image captions, metadata |
| Code / Monospace | Monospace system | 13px | 400 | 20px | 0px | Code blocks and technical content |

### Principles
- Typography prioritizes classical elegance and readability over modernity
- Generous line heights (1.5–1.6 multiplier) create contemplative pacing
- Weight hierarchy relies primarily on size and serif warmth rather than bold/light extremes
- All headings use UTM Horizon for heritage narrative consistency
- Body text uses TF Times New Normal for professional legibility
- Interactive text remains consistent in weight to avoid visual hierarchy confusion

## 4. Component Stylings

### Buttons

#### Primary Button (Large Frosted)
- **Background**: `rgba(255, 255, 255, 0.1)`
- **Text Color**: `rgba(255, 255, 255, 0.85)`
- **Padding**: `0px`
- **Width**: `36px`
- **Height**: `36px`
- **Font Size**: `16px`
- **Font Weight**: `400`
- **Line Height**: `24px`
- **Border Radius**: `9999px`
- **Border**: `0px none`
- **Box Shadow**: `rgba(255, 255, 255, 0.13) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.62) 1.8px 3px 0px -2px inset, rgba(255, 255, 255, 0.46) -2px -2px 0px -2px inset, rgba(0, 0, 0, 0.1) 0px 6px 16px 0px`
- **Hover**: Increase background opacity to `rgba(255, 255, 255, 0.15)`
- **Active**: Set background to `rgba(255, 255, 255, 0.88)` with text color `rgb(16, 40, 50)`

#### Secondary Button (Pill)
- **Background**: `rgba(255, 255, 255, 0.1)`
- **Text Color**: `rgba(255, 255, 255, 0.85)`
- **Padding**: `6px 12px`
- **Width**: `auto`
- **Height**: `32px`
- **Font Size**: `14px`
- **Font Weight**: `400`
- **Line Height**: `20px`
- **Border Radius**: `9999px`
- **Border**: `0px none`
- **Box Shadow**: `rgba(255, 255, 255, 0.13) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.62) 1.8px 3px 0px -2px inset, rgba(255, 255, 255, 0.46) -2px -2px 0px -2px inset, rgba(0, 0, 0, 0.1) 0px 6px 16px 0px`
- **Hover**: Increase background opacity to `rgba(255, 255, 255, 0.15)`

#### Tertiary Button (Icon Square)
- **Background**: `rgba(0, 0, 0, 0)`
- **Text Color**: `rgb(111, 88, 48)`
- **Padding**: `0px`
- **Width**: `40px`
- **Height**: `40px`
- **Font Size**: `16px`
- **Font Weight**: `400`
- **Line Height**: `24px`
- **Border Radius**: `0px`
- **Border**: `0px solid rgb(184, 170, 141)`
- **Box Shadow**: `none`
- **Hover**: Add `border: 1px solid rgb(111, 88, 48)`

### Cards & Containers

#### Content Card
- **Background**: `#FFFFFF`
- **Border Radius**: `8px`
- **Padding**: `24px 32px`
- **Box Shadow**: `rgba(7, 23, 28, 0.22) 0px 18px 44px 0px`
- **Border**: `1px solid #E5E7EB`
- **Text Color**: `#2D2820`

#### Overlay Card (Semi-transparent)
- **Background**: `rgba(45, 40, 32, 0.8)`
- **Backdrop Filter**: `blur(4px)`
- **Border Radius**: `8px`
- **Padding**: `20px 24px`
- **Box Shadow**: `rgba(0, 0, 0, 0.3) 0px 10px 30px 0px`
- **Border**: `1px solid rgba(184, 170, 141, 0.3)`
- **Text Color**: `rgba(255, 255, 255, 0.94)`

#### Image Container
- **Border Radius**: `4px`
- **Overflow**: `hidden`
- **Box Shadow**: `rgba(0, 0, 0, 0.1) 0px 4px 12px 0px`

### Inputs & Forms

#### Text Input
- **Background**: `#FFFFFF`
- **Border**: `1px solid rgb(229, 231, 235)`
- **Border Radius**: `8px`
- **Padding**: `12px 16px`
- **Font Size**: `14px`
- **Font Family**: `'TF Times New Normal', Times, serif`
- **Text Color**: `#2D2820`
- **Placeholder Color**: `rgba(45, 40, 32, 0.5)`
- **Focus Border**: `1px solid rgb(111, 88, 48)`
- **Focus Box Shadow**: `0px 0px 0px 3px rgba(155, 122, 58, 0.1)`

#### Search Input
- **Background**: `#FFFFFF`
- **Border**: `1px solid #E5E7EB`
- **Border Radius**: `9999px`
- **Padding**: `10px 16px`
- **Font Size**: `14px`
- **Text Color**: `#2D2820`
- **Height**: `40px`

### Navigation

#### Navigation Menu
- **Background**: `rgba(0, 0, 0, 0)` (transparent)
- **Text Color**: `rgba(255, 255, 255, 0.94)`
- **Font Size**: `14px`
- **Font Weight**: `500`
- **Line Height**: `20px`
- **Padding**: `0px`
- **Height**: `36px`
- **Border Radius**: `0px`

#### Active Navigation Link
- **Background**: `rgba(255, 255, 255, 0.12)`
- **Text Color**: `#F6D99B`
- **Padding**: `8px 12px`
- **Border Radius**: `9999px`
- **Font Size**: `14px`
- **Font Weight**: `500`
- **Line Height**: `20px`
- **Box Shadow**: `rgba(255, 255, 255, 0.14) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.72) 1.5px 2.5px 0px -2px inset, rgba(255, 255, 255, 0.44) -2px -2px 0px -2px inset`

#### Inactive Navigation Link
- **Background**: `rgba(0, 0, 0, 0)`
- **Text Color**: `rgba(255, 255, 255, 0.94)`
- **Padding**: `8px 12px`
- **Border Radius**: `9999px`
- **Font Size**: `14px`
- **Font Weight**: `500`
- **Line Height**: `20px`
- **Box Shadow**: `none`
- **Hover**: Background becomes `rgba(255, 255, 255, 0.08)`

### Badges & Labels

#### Heritage Badge
- **Background**: `rgba(246, 217, 155, 0.15)`
- **Text Color**: `#6F5830`
- **Padding**: `6px 12px`
- **Border Radius**: `9999px`
- **Font Size**: `12px`
- **Font Weight**: `500`
- **Border**: `1px solid rgba(246, 217, 155, 0.4)`

#### Error Badge
- **Background**: `rgba(185, 77, 53, 0.15)`
- **Text Color**: `#B94D35`
- **Padding**: `6px 12px`
- **Border Radius**: `9999px`
- **Border**: `1px solid rgba(185, 77, 53, 0.4)`

### Tabs

#### Tab Navigation
- **Background**: `#F8F1E3`
- **Border Bottom**: `2px solid transparent`
- **Padding**: `12px 20px`
- **Font Size**: `14px`
- **Font Weight**: `500`
- **Text Color**: `#2D2820`

#### Active Tab
- **Border Bottom**: `2px solid #9B7A3A`
- **Text Color**: `#9B7A3A`

#### Inactive Tab
- **Text Color**: `rgba(45, 40, 32, 0.6)`
- **Hover**: Text color to `rgba(45, 40, 32, 0.8)`

## 5. Layout Principles

### Spacing System
- **Base Unit**: `8px`
- **Scale**: `8px, 12px, 16px, 20px, 24px, 28px, 32px, 40px, 48px, 56px, 64px, 80px`
- **Padding Usage**: `12px` (compact), `16px` (standard), `20px` (comfortable), `24px` (generous), `32px` (spacious)
- **Margin Usage**: `16px` (section separation), `24px` (block separation), `32px` (major section breaks), `40px` (layout breath), `64px` (major visual breaks), `80px` (hero/full-screen spacing)
- **Gap (Flex/Grid)**: `8px` (compact items), `12px` (standard item spacing), `16px` (section item grouping)

### Grid & Container
- **Max Width**: `1440px` for main container
- **Horizontal Padding**: `32px` on desktop, `24px` on tablet, `16px` on mobile
- **Column Strategy**: 12-column grid system at desktop; collapses to 6 columns on tablet, single column on mobile
- **Content Width**: `100%` within container bounds; imagery scales responsively
- **Section Patterns**: Full-bleed hero imagery with semi-transparent overlay cards; alternating image + text sections; centered content zones with max-width `900px` for readability

### Whitespace Philosophy
The design embraces generous whitespace as a storytelling device, not a constraint. Large margins and padding around content create visual rest and direct focus. Hero sections use full-viewport whitespace with layered imagery. Content cards sit within breathing room to feel contemplative rather than crowded. Text is rarely justified to edges; instead, generous gutters create a gallery-like experience. This philosophy prioritizes legibility and emotional pacing over maximum content density.

### Border Radius Scale
- **Minimal/Buttons**: `0px` for heroic buttons and UI elements requiring precision
- **Image/Card**: `4px` for subtle softening on photographs and composed content
- **Soft/Container**: `8px` for content cards, input fields, and container elements
- **Pill/Fully Rounded**: `9999px` for navigation links, badge elements, and circular buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| **Level 0** | No shadow; flat surface | Text layers, flat buttons, background elements |
| **Level 1** | `rgba(255, 255, 255, 0.14) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.72) 1.5px 2.5px 0px -2px inset, rgba(255, 255, 255, 0.44) -2px -2px 0px -2px inset` | Active/highlighted buttons, interactive focus states |
| **Level 2** | `rgba(255, 255, 255, 0.13) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.62) 1.8px 3px 0px -2px inset, rgba(255, 255, 255, 0.46) -2px -2px 0px -2px inset, rgba(0, 0, 0, 0.1) 0px 6px 16px 0px` | Default buttons, frosted glass elements |
| **Level 3** | `rgba(7, 23, 28, 0.22) 0px 18px 44px 0px` | Dropdown menus, modal overlays, prominent cards |
| **Level 4** | `rgb(255, 255, 255) 0px 0px 0px 0px, rgb(184, 170, 141) 0px 0px 0px 1px, rgba(0, 0, 0, 0) 0px 0px 0px 0px` | Tertiary buttons with border emphasis |
| **Level 5** | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` | Minimal depth; subtle separation |

**Shadow Philosophy**: The design employs a frosted-glass aesthetic with inset highlights for interactive elements, creating the illusion of elevated, luminous surfaces without harsh shadows. Shadows are warm-toned (brown/taupe bases) rather than cool black, aligning with the earthy heritage palette. Depth is communicated through subtle inset glows and border tones rather than aggressive drop shadows, maintaining the serene, contemplative atmosphere. Elevation is reserved for modals, dropdowns, and critical focus states—most UI remains flat and integrated into the layout.

## 7. Do's and Don'ts

### Do
- Use `#2D2820` as the primary text color; it provides strong contrast against light backgrounds while maintaining warmth
- Pair heritage gold (`#9B7A3A`) with cream and light gray backgrounds for high-impact highlights and call-to-action elements
- Employ generous line heights (1.5× or greater) for body text to enhance readability and contemplative pacing
- Leverage full-bleed imagery with semi-transparent overlay cards to create immersive hero experiences
- Use frosted glass effects (`rgba(255, 255, 255, 0.1)` backgrounds with inset shadows) for interactive elements on dark backgrounds
- Maintain pill-shaped (`9999px`) borders for navigation links and badges to create visual softness
- Layer decorative Vietnamese motifs subtly behind content without interfering with legibility
- Test all text on imagery with sufficient contrast overlays; minimum WCAG AA ratio of 4.5:1 for body text
- Implement responsive imagery that scales proportionally across breakpoints
- Reserve box shadows for modals, dropdowns, and high-priority overlays; keep most surfaces flat

### Don't
- Don't use pure black (`#000000`) or pure white (`#FFFFFF`) for text; always use `#2D2820` or `rgba(255, 255, 255, 0.94)` for warmth and sophistication
- Don't apply harsh drop shadows to primary UI elements; the frosted-glass inset shadow aesthetic defines the design language
- Don't exceed font size `72px` for headings; the classical typography relies on proportion and weight hierarchy, not extreme scale
- Don't use bright, saturated accent colors; stick to muted heritage gold (`#9B7A3A`) and warm taupes (`#776F62`)
- Don't compress whitespace around cards and sections; generous margins are integral to the visual language
- Don't implement sharp, right-angled corners on interactive elements; use `9999px` for buttons or `8px` for cards
- Don't place interactive elements directly over imagery without a semi-transparent dark overlay; ensure text legibility is never compromised
- Don't mix serif and sans-serif fonts in content areas; maintain UTM Horizon for headings and TF Times New Normal for body
- Don't use weight variations above `500` for body text; the design prioritizes size hierarchy over boldness
- Don't apply color filters or overlays that desaturate the warm earth tones; preserve the heritage palette integrity

## 8. Responsive Behavior

### Breakpoints

| Breakpoint Name | Width | Key Changes |
|-----------------|-------|-------------|
| **Mobile** | `320px–480px` | Single column layout; padding reduced to `16px`; font sizes reduce by 2px–4px; hero imagery height capped at `300px`; navigation collapses to burger menu; buttons stack vertically |
| **Tablet** | `481px–768px` | 6-column grid; padding `24px`; heading sizes reduce to `28px` (H2), `20px` (H3); horizontal card layouts shift to vertical stacks; image containers scale to `50%` width |
| **Desktop** | `769px–1440px` | 12-column grid; padding `32px`; full typography scale applied; side-by-side card layouts; full hero height `600px`–`800px`; multi-column content sections |
| **Large Desktop** | `1441px+` | Max container width `1440px` with centered alignment; extended whitespace in gutters; full-featured layout without truncation |

### Touch Targets
- **Minimum Touch Target**: `44px × 44px` (WCAG 2.1 Level AAA)
- **Buttons**: Minimum `36px` height; larger on mobile (`44px`)
- **Links**: Minimum `40px` height for pill-shaped navigation links
- **Form Inputs**: Minimum `40px` height for search and text fields
- **Icon Buttons**: `36px × 36px` for header actions; increase to `44px` on mobile
- **Spacing Between Targets**: Minimum `8px` gap to avoid accidental taps

### Collapsing Strategy
- **Hero Section**: Reduce height from `800px` (desktop) to `400px` (tablet) to `300px` (mobile); maintain aspect ratio for background imagery
- **Multi-Column Content**: Shift from 3-column to 2-column (tablet) to single-column (mobile) layouts
- **Navigation**: Horizontal pill-shaped links on desktop; collapse to hamburger menu + vertical stack on mobile
- **Cards**: Full-width on mobile (`100% - 2× padding`); side-by-side on tablet; retain spacing on desktop
- **Typography**: Headings reduce by `2px–4px` on tablet, `6px–8px` on mobile (e.g., `H2` from `30px` → `26px` → `22px`)
- **Padding/Margins**: Reduce `40px` gutters to `24px` (tablet), `16px` (mobile); maintain minimum `12px` internal padding on all elements
- **Image Thumbnails**: Reduce size on mobile to `100px × 100px`; maintain aspect ratio
- **Search/Input Fields**: Full width on mobile with `40px` height; inline on tablet/desktop

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA**: Heritage Gold (`#9B7A3A`) — use for highlights, links, and primary interactive states
- **Primary Text**: Dark Charcoal (`#2D2820`) — all body text, headings, and primary labels
- **Background**: Off-White (`#FFFFFF`) or Cream Base (`#FFFAF0`) — light content areas
- **Heading Text**: Dark Charcoal (`#2D2820`) — all heading levels
- **Interactive Button (Light Theme)**: Frost Glass (`rgba(255, 255, 255, 0.1)`) with white text (`rgba(255, 255, 255, 0.85)`)
- **Interactive Button (Neutral Theme)**: Cream Glass (`rgba(255, 255, 255, 0.88)`) with dark text (`rgb(16, 40, 50)`)
- **Accent Border**: Warm Taupe (`#B8AA8D`) — input borders, secondary dividers
- **Error State**: Error Red (`#B94D35`)
- **Warning State**: Warning Gold (`#C19A4B`)
- **Overlay/Modal**: Deep Slate (`#24383C`) with `80%` opacity

### Iteration Guide
1. **Always use `#2D2820` for text on light backgrounds** — it provides warmth and heritage aesthetic; never use pure black
2. **Apply frosted glass effects (`rgba(255, 255, 255, 0.1)` + inset shadow) to interactive buttons** — this is the signature depth treatment
3. **Maintain generous whitespace**: minimum `24px` padding inside cards, `32px` margins between sections, `1.5×` line height on body text
4. **Use UTM Horizon font exclusively for all headings** (H1, H2, H3) — TF Times New Normal is for body/UI only
5. **Apply Heritage Gold (`#9B7A3A`) accent color sparingly** — reserve for active states, links, and key visual hierarchy elements
6. **Set all button border-radius to `9999px` for pill-shaped styles**, except tertiary icon buttons which use `0px`
7. **Implement card backgrounds with `8px` border-radius and `rgba(7, 23, 28, 0.22) 0px 18px 44px 0px` shadow** — this is the standard depth treatment
8. **Ensure all interactive text on dark/transparent backgrounds uses `rgba(255, 255, 255, 0.85)` or highlighted accent gold `#F6D99B`**
9. **Collapse layouts to single-column on mobile (`320px–480px`)** with reduced padding (`16px`) and font sizes (`22px` H2, `18px` H3)
10. **Never use pure white (`#FFFFFF`) text on colored backgrounds** — always use off-white (`rgba(255, 255, 255, 0.94)`) for warmth and visual cohesion