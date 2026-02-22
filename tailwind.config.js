/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        mint: "#34D399",
        "mint-light": "#A7F3D0",
        "mint-dark": "#059669",
        navy: "#0F172A",
        "navy-light": "#1E293B",
        coral: "#FB7185",
        "coral-dark": "#E11D48",
        fresh: "#FAFFFE",
      },
    },
  },
  plugins: [],
};
