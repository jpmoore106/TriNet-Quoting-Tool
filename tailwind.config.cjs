// Colors and fonts from the TriNet Brand Identity Playbook (v2.4).
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B0134", // TriNet Navy, PMS 276C
        orange: { DEFAULT: "#FD5000", dark: "#8F3011", light: "#FF9E79" }, // TriNet Orange, PMS Orange 021C
        tngray: { dark: "#54565A", medium: "#797D82", light: "#DFE1DF" }, // neutral palette
        alert: "#C0143C", // Red, secondary palette
        canvas: "#F2F3F2", // tint of Light Gray for page backgrounds
      },
      fontFamily: {
        // Avenir Next LT Pro is the system font (Centra No. 2 is licensed for design use); Arial is the approved fallback.
        brand: ["'Avenir Next LT Pro'", "'Avenir Next'", "Avenir", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
