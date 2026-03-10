import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Merriweather', 'Georgia', 'serif']
      },
      boxShadow: {
        brutal: '8px 8px 0 0 hsl(var(--ink))'
      },
      borderRadius: {
        brutal: '2px'
      }
    }
  },
  plugins: []
};

export default config;
