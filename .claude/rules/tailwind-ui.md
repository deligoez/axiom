# Tailwind UI Design System

All web UI components must use Tailwind UI components and patterns.

## Reference Location

Tailwind UI components are available at:
```
/Users/deligoez/Downloads/adamwathanss-tuibeta/adamwathanss-tuibeta/html/
```

## Layout

Use the **3-column layout** as the base application shell:
- `ui-blocks/application-ui/application-shells/multi-column/full_width_three_column.html`

### Column Structure for AXIOM

| Column | Width | Content |
|--------|-------|---------|
| Left Sidebar | w-72 | Logo, navigation (Dashboard, Cases, Agents, Config) |
| Middle Panel | w-96 | Context-dependent: Case list, agent details, etc. |
| Main Area | flex-1 | Primary content: Chat, case details, agent output |

## Theme

**AXIOM uses light mode by default.** Do not use dark mode classes unless specifically requested.

### Light Mode Colors
```html
<!-- Background -->
<html class="h-full bg-white">

<!-- Sidebar -->
<div class="border-r border-gray-200 bg-white">

<!-- Text -->
<span class="text-gray-900">Primary text</span>
<span class="text-gray-700">Secondary text</span>
<span class="text-gray-500">Muted text</span>
<span class="text-gray-400">Disabled text</span>

<!-- Active nav item -->
<a class="bg-gray-50 text-indigo-600">

<!-- Inactive nav item -->
<a class="text-gray-700 hover:bg-gray-50 hover:text-indigo-600">

<!-- Borders -->
<div class="border-gray-200">
<div class="ring-1 ring-inset ring-gray-200">
```

## Component Selection

When implementing UI features:

1. **First check** Tailwind UI for existing components
2. **Copy the HTML** directly from the reference files
3. **Adapt** class names and content for AXIOM's needs
4. **Remove** dark mode classes (dark:*) - we use light mode only

## Common Components to Use

| Feature | Tailwind UI Component Path |
|---------|---------------------------|
| Navigation | `navigation/navbars/` |
| Lists | `lists/stacked-lists/` |
| Forms | `forms/` |
| Modals | `overlays/modals/` |
| Notifications | `overlays/notifications/` |
| Buttons | `elements/buttons/` |
| Badges | `elements/badges/` |

## htmx Integration

Tailwind UI components should be wrapped with htmx attributes:
```html
<button
  hx-post="/api/action"
  hx-target="#result"
  hx-swap="innerHTML"
  class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white ...">
  Action
</button>
```

## Icons

Use Heroicons (included in Tailwind UI examples):
- Outline style for navigation
- Solid style for actions/buttons

## Important Notes

1. **No custom elements** - Tailwind UI uses `<el-dialog>` etc. which require `@tailwindplus/elements` JS library. Use standard HTML with htmx instead.
2. **No dark mode** - Use light mode colors consistently
3. **Use text-sm/6** - Tailwind UI uses `text-sm/6` (font-size + line-height) instead of just `text-sm`
