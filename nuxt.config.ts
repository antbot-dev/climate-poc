export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/leaflet',
  ],
  app: {
    head: {
      title: 'Gérer l\'inévitable — Votre commune face à la dérive climatique',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Explorez les risques climatiques de votre commune. Données ouvertes, projections GIEC et gouvernance locale. Compagnon du livre Gérer l\'inévitable.' },
      ],
      htmlAttrs: { lang: 'fr' },
      link: [
        // DM Serif Display — gravitas, editorial warmth
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    mistralApiKey: process.env.MISTRAL_API_KEY || '',
    googleAiApiKey: process.env.GOOGLE_AI_API_KEY || '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  tailwindcss: {
    config: {
      theme: {
        extend: {
          fontFamily: {
            display: ['"DM Serif Display"', 'Georgia', 'serif'],
            body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
          },
          colors: {
            ink: {
              50: '#faf9f7',
              100: '#f3f1ed',
              200: '#e8e4dd',
              300: '#d4cec3',
              400: '#b5ad9e',
              500: '#96897a',
              600: '#7a6e60',
              700: '#5e544a',
              800: '#3d3731',
              900: '#1f1b17',
              950: '#0f0d0b',
            },
            heat: {
              50: '#fef7f0',
              100: '#feecd9',
              200: '#fcd5b0',
              300: '#f9b87d',
              400: '#f59048',
              500: '#f27023',
              600: '#e35719',
              700: '#bc4116',
              800: '#96351a',
              900: '#792e18',
            },
            crisis: {
              400: '#f87171',
              500: '#ef4444',
              600: '#dc2626',
              700: '#b91c1c',
            },
          },
          keyframes: {
            'fade-up': {
              '0%': { opacity: '0', transform: 'translateY(16px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            },
            'fade-in': {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
            },
            'scale-in': {
              '0%': { opacity: '0', transform: 'scale(0.95)' },
              '100%': { opacity: '1', transform: 'scale(1)' },
            },
          },
          animation: {
            'fade-up': 'fade-up 0.6s ease-out both',
            'fade-up-1': 'fade-up 0.6s 0.1s ease-out both',
            'fade-up-2': 'fade-up 0.6s 0.2s ease-out both',
            'fade-up-3': 'fade-up 0.6s 0.3s ease-out both',
            'fade-up-4': 'fade-up 0.6s 0.4s ease-out both',
            'fade-in': 'fade-in 0.5s ease-out both',
            'scale-in': 'scale-in 0.4s ease-out both',
          },
        },
      },
    },
  },
})
