---
name: ui-ux-pro-max
description: >-
  World-class UI/UX design and frontend engineering system. Use when designing,
  building, refining, or evaluating user interfaces, design systems, landing pages,
  dashboards, widgets, forms, components, or user experiences.
---

# UI/UX Pro Max — Modern Design & Frontend Engineering System

This skill equips the agent to think and build as an elite Staff Product Designer & Design Engineer. Every UI element must meet the visual and functional quality standards of industry leaders (Linear, Stripe, Vercel, Apple).

---

## 1. Visual Hierarchy & Design System Foundations

### The 60-30-10 Color Rule
* **60% Dominant (Canvas & Base)**: Clean, luminous neutrals (`#FFFFFF`, `#F8FAFC`, `#F1F5F9` in light mode; `#0B0F19`, `#111827` in dark mode).
* **30% Structural (Surfaces & Typography)**: High-contrast typography (`text-slate-900`, `text-slate-700`), subtle borders (`border-slate-200/80`), subtle elevated cards (`bg-white shadow-sm border`).
* **10% Accent (Conversion & Focus)**: Intentional brand color (`#4F46E5` indigo, `#2563EB` blue) reserved strictly for primary CTAs, active pills, status indicators, and key metric callouts. Never dilute the accent across entire pages.

### Typographic Scale & Contrast
* Maintain tight letter-spacing on bold headings (`tracking-tight` or `-0.02em` on headings $\ge 24\text{px}$).
* Enforce readable line heights: `leading-tight` for titles, `leading-relaxed` (1.6) for body copy.
* Never use pure black (`#000000`) for text; use rich slates (`#0F172A`, `#1E293B`, `#334155`).
* Secondary/muted text must always remain WCAG AA accessible ($\ge 4.5:1$ contrast ratio; `text-slate-500` or `text-slate-600` on white).

### Spacing & Grid Discipline
* Adhere strictly to an **8pt grid** (with 4pt half-steps for micro-spacing):
  * Padding: `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px), `p-12` (48px).
  * Gaps: `gap-1.5` (6px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px).
* Alignment: Text and icons must be vertically centered (`items-center gap-2`).

---

## 2. Component Engineering & The 5-State Rule

Every interactive component, card, form field, and table MUST support all 5 states:
1. **Default State**: Crisp border, balanced padding, legible typography.
2. **Hover / Focus State**: Subtle background tint, border brightness change, glowing focus ring (`focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600`).
3. **Active / Pressed State**: Tactile feedback (`active:scale-[0.99]`).
4. **Loading / Pending State**: Spinner or skeleton shimmer (`animate-pulse bg-slate-100 rounded`), disabled pointer events, preserved width/height to avoid layout shifts.
5. **Empty & Error State**:
   * *Empty*: Informative graphic/icon + clear explanation + immediate next-action button. Never a blank void.
   * *Error*: Soft rose/amber container (`bg-rose-50 text-rose-700 border border-rose-200`) with actionable recovery advice.

---

## 3. Micro-Interactions & Polish

* **Buttons**:
  * Curved radius (`rounded-xl` or `rounded-full`).
  * Elevation shadow colored by accent (`shadow-md shadow-indigo-600/20`).
  * Smooth transition duration: `transition duration-150 ease-in-out`.
* **Forms & Inputs**:
  * Floating or crisp top-aligned labels (`text-xs font-semibold text-slate-700 mb-1.5`).
  * Integrated left icons (mail, lock, search) with pointer-events-none.
  * Clear trailing helpers (eye toggles, clear buttons, copy icons).
* **Cards & Containers**:
  * Layered borders (`border border-slate-200/80 shadow-sm hover:shadow-md transition`).
  * Rounded corners matching global radius curve (`rounded-2xl` for cards, `rounded-3xl` for modals/heroes).

---

## 4. Mobile-First & Responsive UX

* **Touch Targets**: Minimum $44 \times 44\text{px}$ clickable area for buttons and interactive badges.
* **Layout Adaptability**:
  * Dashboards: Desktop-first ergonomics with collapsible drawer/rail on tablet and mobile.
  * Consumer Widgets: Mobile-first bottom-sheet drawer on small screens, floating popover on desktop.
* **No Horizontal Overflow**: Always protect text with `truncate`, `break-words`, or `overflow-hidden`.

---

## 5. Execution Checklist for UI Tasks

Before marking any UI code complete:
- [ ] Are the contrast ratios sharp and accessible?
- [ ] Are empty, loading, and error states gracefully rendered?
- [ ] Is there tactile feedback on click/press (`active:scale-[0.99]`)?
- [ ] Does the layout adapt fluidly to mobile viewports without horizontal scrolling?
- [ ] Is typography hierarchy clear (Title $\rightarrow$ Subtitle $\rightarrow$ Body $\rightarrow$ Caption)?
- [ ] Are all icons aligned vertically with their accompanying text?
