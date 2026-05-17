/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                /* ── NV design system ── */
                'nv-bg':        '#0A0A0B',
                'nv-surface':   '#111113',
                'nv-surface-2': '#161618',
                'nv-surface-3': '#1A1A1D',
                'nv-border':    '#1E1E21',
                'nv-border-2':  '#2A2A2E',
                'nv-gold':      '#C9962A',
                'nv-gold-text': '#D4A843',
                'nv-platinum':  '#9EA8B3',
                'nv-muted':     '#4A5260',
                'nv-sage':      '#4CAF82',
                'nv-coral':     '#C94F4F',
                'nv-ice':       '#5B9BD5',
                'nv-amber':     '#D4892A',
                /* ── Legacy aliases (landing page depends on these) ── */
                background:       '#0A0A0B',
                surface:          '#111113',
                'surface-2':      '#161618',
                primary:          '#C9962A',
                'primary-gold':   '#C9962A',
                'soft-gold':      '#C9962A',
                'gold-primary':   '#D4AF37',
                'gold-light':     '#F9E2AF',
                'gold-bright':    '#FFD966',
                'gold-dark':      '#9A7B2C',
                'gold-muted':     '#C6A85A',
                highlight:        '#D4A843',
                bronze:           '#9A7B2C',
                'text-primary':   '#E2E8F0',
                'text-secondary': '#9EA8B3',
                glass:            'rgba(10, 10, 11, 0.7)',
            },
            fontFamily: {
                sans:    ['Inter', 'system-ui', 'sans-serif'],
                heading: ['Inter', 'system-ui', 'sans-serif'],
                mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
                data:    ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            fontSize: {
                'market-mood':    ['48px', { lineHeight: '1',   fontWeight: '700', letterSpacing: '-0.03em' }],
                'market-mood-lg': ['64px', { lineHeight: '1',   fontWeight: '700', letterSpacing: '-0.04em' }],
                'card-header':    ['15px', { lineHeight: '1.3', fontWeight: '500' }],
                'page-title':     ['22px', { lineHeight: '1.2', fontWeight: '600' }],
                'label':          ['11px', { letterSpacing: '0.08em', lineHeight: '1' }],
                'micro':          ['9px',  { letterSpacing: '0.12em', lineHeight: '1' }],
            },
            boxShadow: {
                'nv-gold':    '0 0 20px rgba(201, 150, 42, 0.22)',
                'nv-sage':    '0 0 12px rgba(76, 175, 130, 0.25)',
                'nv-coral':   '0 0 12px rgba(201, 79, 79, 0.25)',
                'nv-ice':     '0 0 12px rgba(91, 155, 213, 0.25)',
                /* legacy */
                'gold-glow':  '0 0 20px rgba(212, 175, 55, 0.2)',
            },
            animation: {
                'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'nv-breathe':  'nvBreathe 3s ease-in-out infinite',
            },
            backgroundImage: {
                'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F9E2AF 50%, #9A7B2C 100%)',
                'nv-gold-gradient': 'linear-gradient(135deg, #C9962A 0%, #D4A843 100%)',
            },
            borderRadius: {
                'nv': '8px',
            },
        },
    },
    plugins: [],
}
