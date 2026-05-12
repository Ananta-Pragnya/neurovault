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
                background: '#0D1117', // Soft Dark (User Spec)
                surface: '#161B22',    // Slightly lighter
                primary: '#C6A85A',    // Soft Gold (User Spec)
                'primary-gold': '#C6A85A',
                'soft-gold': '#C6A85A',
                highlight: '#F6E27A',
                bronze: '#A89060',     // Antique Bronze (User Spec)
                'text-primary': '#E6EDF3', // GitHub Light
                'text-secondary': '#8B949E', // Muted Gray
                glass: 'rgba(255, 255, 255, 0.03)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Space Grotesk', 'sans-serif'],
            },
            fontSize: {
                'market-mood': ['48px', { lineHeight: '1', fontWeight: '900' }],
                'market-mood-lg': ['64px', { lineHeight: '1', fontWeight: '900' }],
                'card-header': ['20px', { lineHeight: '1.2', fontWeight: '600' }],
                'label': ['11px', { letterSpacing: '0.1em', lineHeight: '1' }],
            },
            boxShadow: {
                'gold-glow': '0 0 20px rgba(212, 175, 55, 0.12)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
}
