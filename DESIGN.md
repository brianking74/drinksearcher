---
name: DrinkSearcher.HK
description: "Dark luxury marketplace for Hong Kong drinks discovery. Gold/champagne accent on deep charcoal, editorial serif for display, DM Sans for UI."

colors:
  # Backgrounds
  bg: "#090a0b"
  bg-soft: "#0d0f10"
  surface: "#111315"
  surface-2: "#16191b"
  surface-3: "#1b1e20"
  card: "#111315"

  # Borders
  border: "#292d2f"
  border-strong: "#414648"

  # Text
  text: "#f4f0e7"
  muted: "#a6a39c"

  # Accent
  gold: "#c8aa6e"
  gold-soft: "rgba(200,170,110,.1)"
  jade: "#87a894"
  jade-soft: "rgba(135,168,148,.11)"

typography:
  sans: "'DM Sans', sans-serif"
  serif: "'Instrument Serif', Georgia, serif"

radii:
  default: "10px"
  small: "6px"

max-width: "1440px"
---
# Design System: DrinkSearcher.HK

## 1. Overview: Dark Luxury

DrinkSearcher.HK is a premium dark-theme marketplace for Hong Kong drinks and nightlife. The visual system is built around a refined editorial luxury feel: deep charcoal backgrounds, warm champagne/gold accents, serif display typography, and rich photography. It should feel like a cross between a luxury concierge and a modern marketplace — expensive but functional, editorial but actionable.

**Key characteristics:**
- Deep dark base (#090a0b), never pure black
- Warm gold (#c8aa6e) as the single brand accent
- Jade (#87a894) for positive/verified signals
- Instrument Serif for display/headline (editorial, refined)
- DM Sans for UI (clean, modern)
- Thin borders (#292d2f), never heavy strokes
- No shadows (flat design), no glassmorphism, no purple gradients

## 2. Colors

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#090a0b` | Page background |
| `--bg-soft` | `#0d0f10` | Section backgrounds |
| `--surface` | `#111315` | Cards, panels |
| `--surface-2` | `#16191b` | Elevated surfaces |
| `--surface-3` | `#1b1e20` | Hover states |

### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `--gold` | `#c8aa6e` | Primary accent, CTAs, highlights |
| `--gold-soft` | `rgba(200,170,110,.1)` | Subtle gold backgrounds |
| `--jade` | `#87a894` | Verified, fresh, positive signals |
| `--jade-soft` | `rgba(135,168,148,.11)` | Subtle jade backgrounds |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text` | `#f4f0e7` | Primary body text |
| `--muted` | `#a6a39c` | Secondary/meta text |

### Borders
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#292d2f` | Default borders |
| `--border-strong` | `#414648` | Hover/active borders |

## 3. Typography

| Role | Font Family | Size |
|------|------------|------|
| Display/H1 | Instrument Serif | `clamp(3rem, 6.6vw, 6.8rem)` |
| H2 | Instrument Serif | `clamp(2.2rem, 4vw, 4.4rem)` |
| H3 | Instrument Serif | `clamp(1.35rem, 2vw, 2rem)` |
| Body/UI | DM Sans | 0.69rem–0.95rem |
| Eyebrow | DM Sans | 0.7rem, uppercase, 0.16em letter-spacing |

**Line heights:** Display 0.91, H2 0.96, H3 1.05, Body 1.55

## 4. Spacing & Layout

- Max content width: 1440px
- Card padding: 16–18px
- Section padding: `clamp(72px, 9vw, 128px)`
- Grid gap: 16px
- Container margin: `clamp(32px, 6vw, 96px)`

## 5. Components

### Buttons
- **Primary**: Gold background (`#c8aa6e`), dark text (`#111`), min-height 44px, border-radius 4px
- **Ghost**: Transparent background, border-strong stroke, text color text
- **Border-radius**: 4px all buttons

### Cards (Result Cards)
- Background: `--surface` (#111315)
- Border: 1px solid `--border`
- Border-radius: 8px
- Hover: border becomes `--border-strong`
- Image containers: #efefef background
- Bottle images: mix-blend-mode: multiply

### Filter Panel
- Background: #0d0f10
- Border: 1px solid `--border`
- Border-radius: 8px
- Checkbox accent: gold

### Directory Layout
- Two-column grid: 250px filters + 1fr results
- Filters collapse to drawer below 860px

### Trust Rail
- 6-column grid
- Dark background (#0d0f10)
- Border top/bottom only (1px solid --border)
- Serif numbers, sans labels

### District Map
- Stylised HK map background (radial gradient)
- Gold-bordered pins
- Active when Map view selected

## 6. Photography & Imagery

- Product images: #efefef background, contain sizing, multiply blend for bottles
- Venue/storefront images: object-fit cover
- All images: subtle desaturation via filter

## 7. Do and Do Not

### Do
- Use gold as the single brand accent
- Keep backgrounds dark and warm
- Use Instrument Serif for headlines
- Use DM Sans for UI
- Show stock freshness and verification status prominently
- Keep CTAs clear and actionable
- Use jade for "verified" and "fresh" signals

### Do Not
- Use multiple accent colors (gold only, no purple, no cyan, no pink except secondary)
- Use glassmorphism, heavy shadows, or gradients on surfaces
- Crowd the layout — spacious hierarchy
- Use pure black or pure white
- Use generic stock photography of drinks
- Put gold text on light backgrounds
