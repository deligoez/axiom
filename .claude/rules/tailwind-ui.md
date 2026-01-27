# Tailwind UI Design System

All web UI components must use Tailwind UI components and patterns.

## Reference Location

Tailwind UI components are available at:
```
/Users/deligoez/Downloads/adamwathanss-tuibeta/adamwathanss-tuibeta/html/
```

## Layout

Use the **3-column layout with header** as the base application shell:
- `ui-blocks/application-ui/application-shells/multi-column/full_width_three_column.html`
- `ui-blocks/application-ui/application-shells/multi-column/full_width_with_narrow_sidebar_and_header.html`

### Column Structure for AXIOM

| Column | Width | Content |
|--------|-------|---------|
| Left Sidebar | w-72 | Logo, navigation (Dashboard, Cases, Agents, Config) |
| Middle Panel | w-96 | Context-dependent: Case list, agent details, etc. |
| Main Area | flex-1 | Primary content: Chat, case details, agent output |
| Header | h-16 | Search, dark mode toggle, notifications, status |

## Theme

**AXIOM supports both light and dark mode.** Use `dark:` variants for all color classes.

### Theme Toggle

The layout includes a light/dark mode toggle in the header. Theme preference is saved to localStorage and respects system preference as fallback.

```javascript
// Check and apply theme on page load
if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// Toggle function
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
```

### Color Patterns (Light + Dark)

```html
<!-- Background -->
<html class="h-full bg-white dark:bg-gray-900">

<!-- Sidebar -->
<div class="border-r border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">

<!-- Text -->
<span class="text-gray-900 dark:text-white">Primary text</span>
<span class="text-gray-700 dark:text-gray-400">Secondary text</span>
<span class="text-gray-500">Muted text (same in both)</span>

<!-- Active nav item -->
<a class="bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white">

<!-- Inactive nav item -->
<a class="text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">

<!-- Borders -->
<div class="border-gray-200 dark:border-white/10">
<div class="ring-1 ring-inset ring-gray-200 dark:ring-white/10">

<!-- Backgrounds for cards -->
<div class="bg-gray-50 dark:bg-white/5">
```

## Component Selection

When implementing UI features:

1. **First check** Tailwind UI for existing components
2. **Copy the HTML** directly from the reference files
3. **Adapt** class names and content for AXIOM's needs
4. **Include both light and dark variants** - always add `dark:` classes

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
2. **Always include dark: variants** - Every color class needs a dark mode counterpart
3. **Use text-sm/6** - Tailwind UI uses `text-sm/6` (font-size + line-height) instead of just `text-sm`
4. **Header is sticky** - The header uses `sticky top-0 z-40` to stay visible on scroll
