/** @type {import('tailwindcss').Config} */

// Small helper so every token supports Tailwind's opacity modifiers,
// e.g. bg-bg/60, text-fg/80, border-line/50.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// Every shade of a legacy hue collapses onto a single token, since the
// accent is intentionally monochrome and status colors carry no scale.
function fullShade(value) {
  return {
    50: value, 100: value, 200: value, 300: value, 400: value,
    500: value, 600: value, 700: value, 800: value, 900: value, 950: value,
  };
}

export default {
  darkMode: "class", // html.dark — runtime class toggle, instant + total
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    borderRadius: {
      none: "0px",
      full: "9999px", // reserved for the mobile FAB — the one exception
      DEFAULT: "0px",
    },
    extend: {
      colors: {
        bg:         token("bg"),
        surface:    token("surface"),
        elevated:   token("elevated"),
        fg:         token("fg"),
        muted:      token("muted"),
        faint:      token("faint"),
        line:       token("line"),
        accent:     token("accent"),
        "accent-fg": token("accent-fg"),
        success:    token("success"),
        danger:     token("danger"),
        warn:       token("warn"),

        // ----------------------------------------------------------------
        // Legacy Tailwind palette remap — components that still use
        // slate/cyan/fuchsia/emerald/red/amber/black/white classes conform
        // to the token set in both themes automatically.
        // ----------------------------------------------------------------
        slate: {
          50: token("bg"),   100: token("bg"),   200: token("surface"),
          300: token("line"), 400: token("line"), 500: token("faint"),
          600: token("muted"), 700: token("muted"), 800: token("fg"),
          900: token("fg"),  950: token("fg"),
        },
        cyan:    fullShade(token("accent")),
        fuchsia: fullShade(token("accent")),
        emerald: fullShade(token("success")),
        red:     fullShade(token("danger")),
        amber:   fullShade(token("warn")),
        black:   token("fg"),
        white:   token("surface"),

        // Legacy brand colors — map to accent
        brand: fullShade(token("accent")),
        dark: {
          900: token("bg"),
          800: token("bg"),
          700: token("surface"),
          600: token("elevated"),
          500: token("line"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans:    ["var(--font-sans)"],
        mono:    ["var(--font-mono)"],
      },
      boxShadow: {
        hard:      "var(--shadow-hard-x) var(--shadow-hard-y) 0 0 var(--shadow-hard-color)",
        "hard-lift": "calc(var(--shadow-hard-x) + 1px) calc(var(--shadow-hard-y) + 1px) 0 0 var(--shadow-hard-color)",
      },
      keyframes: {
        "fade-in":       { from: { opacity: 0 }, to: { opacity: 1 } },
        pop:             { "0%": { opacity: 0, transform: "scale(0.94)" }, "100%": { opacity: 1, transform: "scale(1)" } },
        "pop-in":        { "0%": { opacity: 0, transform: "scale(0.9) translateY(2px)" }, "100%": { opacity: 1, transform: "scale(1) translateY(0)" } },
        "slide-up":      { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "slide-in-left": { from: { opacity: 0, transform: "translateX(-16px)" }, to: { opacity: 1, transform: "translateX(0)" } },
        "slide-in-right":{ from: { opacity: 0, transform: "translateX(16px)"  }, to: { opacity: 1, transform: "translateX(0)" } },
        "letter-drop":   { "0%": { opacity: 0, transform: "translateY(-12px)" }, "60%": { opacity: 1, transform: "translateY(2px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        flash:           { "0%,100%": { backgroundColor: "transparent" }, "50%": { backgroundColor: "rgb(var(--accent) / 0.08)" } },
        blink:           { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
      },
      animation: {
        "fade-in":     "fade-in 0.2s ease both",
        pop:           "pop 0.16s ease both",
        "pop-in":      "pop-in 0.1s ease both",
        "slide-up":    "slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "slide-left":  "slide-in-left 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "slide-right": "slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "letter-drop": "letter-drop 0.5s cubic-bezier(0.16,1,0.3,1) both",
        flash:         "flash 0.6s ease",
        blink:         "blink 1s step-start infinite",
      },
    },
  },
  plugins: [],
};
