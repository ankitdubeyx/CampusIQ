---
name: CampusIQ
description: Minimal and Modern Student Retention & Success Analytics System
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-subtle: "#eff6ff"
  canvas: "#f8fafc"
  surface: "#ffffff"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#94a3b8"
  border-subtle: "#e2e8f0"
  border-strong: "#cbd5e1"
  status-risk: "#e11d48"
  status-risk-subtle: "#fff1f2"
  status-warning: "#d97706"
  status-warning-subtle: "#fef3c7"
  status-success: "#059669"
  status-success-subtle: "#ecfdf5"
typography:
  family: "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  body:
    fontSize: "0.9375rem"
    lineHeight: 1.5
    fontWeight: 400
  caption:
    fontSize: "0.875rem"
    lineHeight: 1.5
    fontWeight: 400
  micro:
    fontSize: "0.75rem"
    lineHeight: 1.4
    fontWeight: 500
  heading-xl:
    fontSize: "2rem"
    lineHeight: 1.25
    fontWeight: 700
    letterSpacing: "-0.02em"
  heading-lg:
    fontSize: "1.25rem"
    lineHeight: 1.3
    fontWeight: 600
    letterSpacing: "-0.015em"
  heading-md:
    fontSize: "1rem"
    lineHeight: 1.4
    fontWeight: 600
  tabular:
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
shadows:
  card: "0 1px 3px 0 rgba(15, 23, 42, 0.05)"
  dropdown: "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)"
---

# Design System: Minimal & Modern CampusIQ

## 1. Visual World & Philosophy
CampusIQ embodies restrained modern institutional software (in the lineage of Linear, Stripe, and Vercel). Information takes absolute precedence over visual noise. Every line, tint, and badge serves an analytical purpose in predicting and remedying student attrition.

## 2. Color Palette & Semantic Tints
- **Canvas:** Clean off-white `#f8fafc` creating a comfortable, glare-free environment.
- **Card Surfaces:** Pure `#ffffff` framed with hairline 1px borders (`#e2e8f0`) and subtle elevation (`shadow-xs`).
- **Accent:** Purposeful Cobalt `#2563eb` used exclusively for primary CTAs, active segment tabs, selected student rows, and chart metrics.
- **Triage Semantics:**
  - High Risk: Rose `#e11d48`
  - Medium Risk: Amber `#d97706`
  - Low Risk: Emerald `#059669`

## 3. Typography
Single typeface (`Figtree`) ensuring cohesive hierarchy across all viewports.
- All numeric telemetry and KPIs use `tabular-nums` for rock-solid tabular alignment.
- Labels use subtle uppercase letter-spacing (0.04em) at 11px/12px with high contrast against white backgrounds.

## 4. Spacing & Container Hierarchy
- No nested cards or heavy drop shadows.
- Sections are cleanly divided with subtle borders (`border-slate-200`) and generous whitespace.
- Minimum interactive touch targets meet WCAG 2.1 AA ($\ge 44\text{px}$).
