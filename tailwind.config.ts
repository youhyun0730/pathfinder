import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ノードカラー
        'node-center': '#FFD700',
        'node-current': '#4A90E2',
        'node-skill': '#7ED321',
        'node-cert': '#9013FE',
        'node-position': '#F5A623',
        'node-goal': '#D0021B',
      },
    },
  },
  plugins: [],
};
export default config;
