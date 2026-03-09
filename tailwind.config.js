/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                },
            },
            borderRadius: {
                '2xl': '1rem',
                xl: 'var(--radius)',
                lg: 'calc(var(--radius) - 2px)',
                md: 'calc(var(--radius) - 4px)',
                sm: 'calc(var(--radius) - 6px)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 0 20px -5px hsl(var(--primary) / 0.3)',
                'glow-lg': '0 0 40px -10px hsl(var(--primary) / 0.4)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'gradient': 'gradient-shift 4s ease infinite',
                'shimmer': 'shimmer 2s infinite',
                'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            },
            backgroundSize: {
                '200%': '200% 200%',
            },
        },
    },
    plugins: [],
}
