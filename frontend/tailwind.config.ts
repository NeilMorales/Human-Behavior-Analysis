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
                bg: {
                    primary: '#0D1117',  // deep space black
                    secondary: '#161B22',  // card surface
                    tertiary: '#1C2128',  // hover / elevated
                },
                border: '#30363D',  // separator
                accent: {
                    cyan: '#00D4FF',  // primary CTA, headings, active states
                    violet: '#7C3AED',  // secondary, session bars
                },
                success: '#00FF88',  // high score, completed, productive
                warning: '#FFB800',  // moderate score, neutral, caution
                error: '#FF4444',  // low score, distracting, interrupted
                text: {
                    primary: '#C9D1D9',
                    secondary: '#8B949E',
                }
            },
        },
    },
    plugins: [],
};
export default config;
