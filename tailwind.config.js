/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./internal/web/templates/**/*.html",
  ],
  theme: {
    extend: {
      typography: {
        invert: {
          css: {
            '--tw-prose-body': 'rgb(209 213 219)',
            '--tw-prose-headings': 'rgb(243 244 246)',
            '--tw-prose-links': 'rgb(96 165 250)',
            '--tw-prose-bold': 'rgb(243 244 246)',
            '--tw-prose-counters': 'rgb(156 163 175)',
            '--tw-prose-bullets': 'rgb(156 163 175)',
            '--tw-prose-hr': 'rgb(75 85 99)',
            '--tw-prose-quotes': 'rgb(156 163 175)',
            '--tw-prose-quote-borders': 'rgb(75 85 99)',
            '--tw-prose-captions': 'rgb(156 163 175)',
            '--tw-prose-code': 'rgb(251 191 36)',
            '--tw-prose-pre-code': 'rgb(209 213 219)',
            '--tw-prose-pre-bg': 'rgb(31 41 55)',
            '--tw-prose-th-borders': 'rgb(75 85 99)',
            '--tw-prose-td-borders': 'rgb(55 65 81)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
