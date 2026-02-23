# AgilityAI Style Guide

> Single source of truth for the visual design system. All styling decisions should reference this document.
> Derived from [aiagility-antigravity.vercel.app](https://aiagility-antigravity.vercel.app/).

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| **Body / UI** | `Inter` | All body text, labels, inputs, table data |
| **Headings** | `Plus Jakarta Sans` | h1–h6, section titles, card headers |
| **Code / Mono** | `JetBrains Mono` | Code blocks, technical values |

### Type Scale

| Token | Size | Use |
|-------|------|-----|
| `text-xs` | 0.75rem / 12px | Timestamps, metadata labels |
| `text-sm` | 0.875rem / 14px | Secondary text, descriptions |
| `text-base` | 1rem / 16px | Body copy (default) |
| `text-lg` | 1.125rem / 18px | Card titles, section leads |
| `text-xl` | 1.25rem / 20px | Page subtitles |
| `text-2xl` | 1.5rem / 24px | Page titles |
| `text-3xl` | 1.875rem / 30px | Hero / large display |

**Line height:** `1.6` (body), `1.3` (headings via `tracking-tight`)

---

## Color Palette

All colors are defined as HSL CSS custom properties in `client/src/index.css`.

### Light Mode

| Token | HSL | Hex | Use |
|-------|-----|-----|-----|
| `background` | `210 17% 98%` | `#f8f9fa` | Page background |
| `foreground` | `220 9% 11%` | `#1a1a1a` | Primary text |
| `card` | `0 0% 100%` | `#ffffff` | Card / panel surfaces |
| `primary` | `243 75% 59%` | `#4f46e5` | Buttons, active states, links |
| `primary-foreground` | `0 0% 98%` | `#fafafa` | Text on primary |
| `muted` | `220 13% 95%` | `#f1f3f5` | Subtle backgrounds |
| `muted-foreground` | `220 9% 46%` | `#6b7280` | Secondary / disabled text |
| `border` | `220 13% 91%` | `#e5e7eb` | Dividers, input borders |
| `destructive` | `0 84% 60%` | `#ef4444` | Errors, delete actions |
| `ring` | `243 75% 59%` | `#4f46e5` | Focus outlines |

### Dark Mode

| Token | HSL | Hex | Use |
|-------|-----|-----|-----|
| `background` | `225 24% 8%` | `#0f1117` | Page background |
| `foreground` | `220 13% 91%` | `#e5e7eb` | Primary text |
| `card` | `228 20% 12%` | `#1a1d26` | Card / panel surfaces |
| `primary` | `239 85% 73%` | `#818cf8` | Buttons, active states, links |
| `muted` | `228 12% 17%` | `#23263a` | Subtle backgrounds |
| `muted-foreground` | `220 9% 60%` | `#9ca3af` | Secondary / disabled text |
| `border` | `228 12% 20%` | `#2d3039` | Dividers, input borders |

### Semantic Colors (Consistent Across Modes)

| Purpose | Light | Dark |
|---------|-------|------|
| Success | `#10b981` (Emerald 500) | `#34d399` (Emerald 400) |
| Warning | `#f59e0b` (Amber 500) | `#fbbf24` (Amber 400) |
| Danger | `#ef4444` (Red 500) | `#f87171` (Red 400) |
| Info | `#3b82f6` (Blue 500) | `#60a5fa` (Blue 400) |

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | `4px` | Tags, badges, small chips |
| `rounded-md` | `6px` | Inputs, buttons, small cards |
| `rounded-lg` | `8px` | Cards, panels, modals |
| `rounded-xl` | `12px` | Large containers, dialogs |
| `rounded-full` | `9999px` | Pills, avatars, toggle handles |

---

## Shadows / Elevation

| Level | Value | Use |
|-------|-------|-----|
| Subtle | `0 1px 3px rgba(0,0,0,0.06)` | Cards in light mode |
| Elevated | `0 4px 6px rgba(0,0,0,0.08)` | Dropdowns, popovers |
| Dark subtle | `0 1px 3px rgba(0,0,0,0.35)` | Cards in dark mode |

---

## Component Conventions

### Buttons

- **Primary**: `bg-primary text-primary-foreground` — indigo fill
- **Secondary**: `bg-secondary text-secondary-foreground` — muted fill
- **Ghost**: `hover:bg-accent` — no background at rest
- **Destructive**: `bg-destructive text-destructive-foreground`
- All buttons use `rounded-md` (6px)

### Badges / Status Chips

- Use `rounded-full` for pill shape
- Status colors: `draft` → muted, `review` → amber, `done` → emerald
- Font size: `text-xs`, font weight: `font-medium`

### Cards / Panels

- Background: `bg-card`
- Border: `border border-border`
- Radius: `rounded-lg` (8px)
- No heavy shadows — use border for definition

### Inputs

- Border: `border-input` at rest, `ring-ring` on focus
- Radius: `rounded-md` (6px)
- Background: `bg-background`

### Activity Dots

- Use primary color (`bg-primary`) for recent/active events
- Use muted color (`bg-muted-foreground`) for older events

---

## Icons

- **Library**: Lucide React only (`lucide-react`)
- **Default size**: `16px` (`size-4`) for inline, `20px` (`size-5`) for standalone actions
- **Color**: Inherit from parent text color; use `text-muted-foreground` for decorative icons

---

## Do / Don't

| ✅ Do | ❌ Don't |
|-------|---------|
| Use CSS token names (`bg-primary`) | Hardcode hex/rgb values inline |
| Use `rounded-md` / `rounded-lg` | Use `rounded` (inconsistent default) |
| Use Lucide icons | Install Font Awesome or other icon sets |
| Use `shadcn/ui` components from `components/ui/` | Hand-roll new UI primitives |
| Use `text-muted-foreground` for secondary text | Use `text-gray-500` directly |
| Use Sonner for toasts | Use `alert()` or custom toast implementations |
