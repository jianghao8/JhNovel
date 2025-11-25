// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  // ⭐ 用 class 控制深色模式
  darkMode: 'class',
  content: [
    './index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // ⭐ 把 CSS 变量映射成 Tailwind 颜色
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        border: 'hsl(var(--border))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))'
      }
    }
  },
  plugins: []
};
