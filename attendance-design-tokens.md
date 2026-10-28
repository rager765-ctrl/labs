# Attendance App — Design Tokens

Reusable visual specification derived from the supplied four-screen mobile reference. Values are close visual matches estimated from the displayed raster, not sampled source design files. Keep the vivid blue and pale surfaces consistent; reserve dark overlays for focused flows such as QR scanning.

## Visual direction

Friendly student utility with a polished, lightweight feel. The home view uses a pale blue page background, an illustrated welcome area, white rounded cards, compact attendance summaries, and a fixed bottom navigation. Check-in and check-out actions are prominent indigo pills. The QR scanner is a full-screen charcoal overlay with a bright scan frame; confirmation appears as a white bottom sheet with a small illustration and a single primary action.

## Color palette

| Token | Hex | Use |
|---|---|---|
| `color.brand.700` | `#283DB8` | Primary buttons, selected navigation, strong brand areas |
| `color.brand.600` | `#354BD1` | Main action blue and active icons |
| `color.brand.500` | `#5369E8` | Secondary blue, chart accents, illustration details |
| `color.brand.100` | `#DCE6FF` | Soft blue cards, icon wells, selected backgrounds |
| `color.brand.50` | `#EEF3FF` | App background and tinted surfaces |
| `color.ink.900` | `#171A2B` | Main headings and high contrast text |
| `color.ink.700` | `#3F4658` | Body text |
| `color.ink.500` | `#7D8496` | Helper text, labels, timestamps |
| `color.surface` | `#FFFFFF` | Cards, bottom sheet, navigation bar |
| `color.line` | `#E6EAF2` | Card outlines and separators |
| `color.success.700` | `#15845A` | Completed / checked-in status |
| `color.success.100` | `#E6F6EF` | Success badges and quiet status backgrounds |
| `color.warning.700` | `#A96812` | Late or attention status |
| `color.warning.100` | `#FFF2D8` | Warning badge background |
| `color.danger.700` | `#B83A4B` | Failed check-in / destructive status |
| `color.overlay` | `rgba(10, 13, 22, 0.58)` | Darken underlying view during scan or modal flow |
| `color.scan.surface` | `#66686B` | Scanner screen background in the reference |

## CSS custom properties

```css
:root {
  color-scheme: light;
  --color-brand-700: #283db8;
  --color-brand-600: #354bd1;
  --color-brand-500: #5369e8;
  --color-brand-100: #dce6ff;
  --color-brand-50: #eef3ff;
  --color-ink-900: #171a2b;
  --color-ink-700: #3f4658;
  --color-ink-500: #7d8496;
  --color-surface: #ffffff;
  --color-line: #e6eaf2;
  --color-success-700: #15845a;
  --color-success-100: #e6f6ef;
  --color-warning-700: #a96812;
  --color-warning-100: #fff2d8;
  --color-danger-700: #b83a4b;
  --color-overlay: rgb(10 13 22 / 58%);
  --color-scan-surface: #66686b;

  --font-ui: "Poppins", "Inter", ui-sans-serif, system-ui, sans-serif;
  --text-display: 700 24px/30px var(--font-ui);
  --text-heading: 600 18px/24px var(--font-ui);
  --text-card-title: 600 14px/20px var(--font-ui);
  --text-body: 400 13px/19px var(--font-ui);
  --text-label: 600 11px/16px var(--font-ui);
  --text-caption: 400 10px/14px var(--font-ui);
  --text-metric: 700 20px/24px var(--font-ui);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-pill: 999px;
  --border-hairline: 1px solid var(--color-line);
  --shadow-card: 0 3px 12px rgb(35 54 120 / 7%);
  --shadow-sheet: 0 -8px 28px rgb(15 20 40 / 18%);
  --shadow-button: 0 3px 8px rgb(40 61 184 / 18%);

  --layout-page-inset: 16px;
  --layout-content-max: 480px;
  --size-control: 44px;
  --size-nav: 64px;
}
```
