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
                background:        '#020204',
                surface:           '#0C0C10',
                'surface-2':       '#121218',
                'surface-3':       '#18181F',
                accent:            '#00E8C8',
                'accent-dim':      'rgba(0, 232, 200, 0.10)',
                amber:             '#FF8C00',
                danger:            '#FF3055',
                positive:          '#00CC88',
                // legacy aliases kept so old code doesn't break
                primary:           '#00E8C8',
                'primary-gold':    '#00E8C8',
                'soft-gold':       '#00E8C8',
                highlight:         '#00E8C8',
                bronze:            '#00CC88',
                'text-primary':    '#C8C8D8',
                'text-secondary':  '#505060',
                glass:             'rgba(12, 12, 16, 0.92)',
            },
            fontFamily: {
                sans:    ['IBM Plex Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
                mono:    ['IBM Plex Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
                heading: ['IBM Plex Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
            },
            fontSize: {
                'market-mood':    ['48px', { lineHeight: '1',   fontWeight: '700', letterSpacing: '-0.02em' }],
                'market-mood-lg': ['64px', { lineHeight: '1',   fontWeight: '700', letterSpacing: '-0.02em' }],
                'card-header':    ['14px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.05em' }],
                'label':          ['9px',  { letterSpacing: '0.15em', lineHeight: '1', textTransform: 'uppercase' }],
            },
            boxShadow: {
                'accent-glow': '0 0 8px rgba(0, 232, 200, 0.5), 0 0 24px rgba(0, 232, 200, 0.12)',
                'amber-glow':  '0 0 8px rgba(255, 140, 0, 0.4)',
                'red-glow':    '0 0 8px rgba(255, 48, 85, 0.4)',
                'green-glow':  '0 0 8px rgba(0, 204, 136, 0.4)',
                // legacy
                'gold-glow':   '0 0 8px rgba(0, 232, 200, 0.5), 0 0 24px rgba(0, 232, 200, 0.12)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            borderColor: {
                DEFAULT: '#1C1C26',
            },
        },
    },
    plugins: [],
}
