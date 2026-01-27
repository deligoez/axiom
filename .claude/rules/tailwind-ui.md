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

## Component Selection

When implementing UI features:

1. **First check** Tailwind UI for existing components
2. **Copy the HTML** directly from the reference files
3. **Adapt** class names and content for AXIOM's needs
4. **Keep** the dark mode classes (`dark:*`)

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

## Dark Mode

AXIOM uses dark mode by default. Always include dark mode variants:
```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

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
