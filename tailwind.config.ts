/* Tailwind CSS Configuration for Biblioteca Culinária */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'Playfair Display', 'serif'],
      },
      colors: {
        tinta: '#1C1B17',
        'tinta-sec': '#6B675E',
        'tinta-ter': '#9A958A',
        marfim: '#FBF8F3',
        'marfim-card': '#F5F1E9',
        'marfim-border': '#E7E1D6',
        verde: {
          DEFAULT: '#2F4B3A',
          hover: '#24392C',
          light: '#3F614C',
          subtle: '#EBF2EE',
        },
        bronze: {
          DEFAULT: '#B98A4F',
          hover: '#A87A40',
          light: '#D4A86A',
          subtle: '#F7F0E6',
        },
        sucesso: '#4C7A5B',
        aviso: '#C29A3B',
        erro: '#B4553F',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: '14px',
        md: '10px',
        sm: '6px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(28, 27, 23, 0.06)',
        'card-hover': '0 16px 40px rgba(28, 27, 23, 0.10)',
        dropdown: '0 10px 30px rgba(28, 27, 23, 0.12)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
