//@ts-check

const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        coinbase: { primary: '#4a6cee', diabled: '#192445' },
        primary: {
          DEFAULT: 'rgb(var(--ls-colors-primary, 228, 37, 117), <alpha-value>)',
          '50': 'rgb(var(--ls-colors-primary-50, 248, 200, 220), <alpha-value>)',
          '100': 'rgb(var(--ls-colors-primary-100, 246, 182, 209), <alpha-value>)',
          '200': 'rgb(var(--ls-colors-primary-200, 241, 146, 186), <alpha-value>)',
          '300': 'rgb(var(--ls-colors-primary-300, 237, 110, 163), <alpha-value>)',
          '400': 'rgb(var(--ls-colors-primary-400, 232, 73, 140), <alpha-value>)',
          '500': 'rgb(var(--ls-colors-primary-500, 228, 37, 117), <alpha-value>)',
          '600': 'rgb(var(--ls-colors-primary-600, 166, 51, 94), <alpha-value>)',
          '700': 'rgb(var(--ls-colors-primary-700, 136, 17, 67), <alpha-value>)',
          '800': 'rgb(var(--ls-colors-primary-800, 147, 8, 99), <alpha-value>)',
          '900': 'rgb(var(--ls-colors-primary-900, 110, 0, 64), <alpha-value>)',
          'background': 'rgb(var(--ls-colors-backdrop, 62, 18, 64), <alpha-value>)',
          'text': 'rgb(var(--ls-colors-primary-text, 255, 255, 255), <alpha-value>)',
          'text-muted': 'rgb(var(--ls-colors-primary-text-muted, 86, 97, 123), <alpha-value>)',
          'text-placeholder': 'rgb(var(--ls-colors-text-placeholder, 140, 152, 192), <alpha-value>)',
          'actionButtonText': 'rgb(var(--ls-colors-actionButtonText, 255, 255, 255), <alpha-value>)',
          'buttonTextColor': 'rgb(var(--ls-colors-buttonTextColor, 228, 229, 240), <alpha-value>)',
          'logoColor': 'rgb(var(--ls-colors-logo, 255, 0, 147), <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--ls-colors-accent, 255, 0, 147), <alpha-value>)',
          'hover': 'rgb(var(--ls-colors-accent-hover, 255, 0, 147), <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--ls-colors-secondary, 17, 29, 54), <alpha-value>)',
          '50': 'rgb(var(--ls-colors-secondary-50, 49, 60, 155), <alpha-value>)',
          '100': 'rgb(var(--ls-colors-secondary-100, 46, 59, 147), <alpha-value>)',
          '200': 'rgb(var(--ls-colors-secondary-200, 35, 42, 112), <alpha-value>)',
          '300': 'rgb(var(--ls-colors-secondary-300, 32, 41, 101), <alpha-value>)',
          '400': 'rgb(var(--ls-colors-secondary-400, 28, 39, 89), <alpha-value>)',
          '500': 'rgb(var(--ls-colors-secondary-500, 22, 37, 70), <alpha-value>)',
          '600': 'rgb(var(--ls-colors-secondary-600, 20, 33, 62), <alpha-value>)',
          '700': 'rgb(var(--ls-colors-secondary-700, 17, 29, 54), <alpha-value>)',
          '800': 'rgb(var(--ls-colors-secondary-800, 15, 25, 47), <alpha-value>)',
          '900': 'rgb(var(--ls-colors-secondary-900, 12, 21, 39), <alpha-value>)',
          '950': 'rgb(var(--ls-colors-secondary-950, 11, 17, 35), <alpha-value>)',
          'text': 'rgb(var(--ls-colors-secondary-text, 171, 181, 209), <alpha-value>)',
        },
      },
      borderRadius: {
        'containerRoundness': 'var(--ls-border-radius-containerRoundness, 16px)',
        'componentRoundness': 'var(--ls-border-radius-componentRoundness, 8px)',
      },
      opacity: {
        '35': '.35',
      },
      transitionDuration: {
        '0': '0ms',
        '2000': '2000ms',
      },
      transitionProperty: {
        'height': 'height'
      },
      animation: {
        'reverse-spin': 'reverse-spin 1s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'spin-fast': 'spin 1s linear infinite',
        'fade-in': 'fade-in 0.5s ease-in',
        'fade-in-down': 'fade-in-down 0.5s ease-in',
        'fadein': 'fadein 4s',
        'slide-in': 'slide-in 300ms',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "blinking": "blink 1.1s step-end infinite",
        rotate: "rotate 2s linear infinite",
        scaleLoop: 'scaleLoop 6s infinite ease-in-out',
        // Tooltip
        "slide-up-fade": "slide-up-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down-fade": "slide-down-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",

        // Gauge
        gauge_fadeIn: "gauge_fadeIn 1s ease forwards",
        gauge_fill: "gauge_fill 1s ease forwards",

        //pulse
        circle1: "circle1 3s ease-in-out infinite",
        circle2: "circle2 3s ease-in-out infinite",
        circle3: "circle3 3s ease-in-out infinite",
        circle4: "circle4 3s ease-in-out infinite",
        circle5: "circle5 3s ease-in-out infinite",
      },
      keyframes: {
        scaleLoop: {
          '0%, 100%': { transform: 'scale(0.5)' },
          '50%': { transform: 'scale(1)' },
        },
        rotate: {
          "0%": { transform: "rotate(-0deg) scale(-10)" },
          "100%": { transform: "rotate(360deg) scale(-10)" },
        },
        "reverse-spin": {
          from: {
            transform: 'rotate(360deg)'
          }
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        'blink': {
          '0%': {
            color: 'transparent',
          },
          '50%': {
            color: 'white',
          },
          '100%': {
            color: 'transparent',
          },
        },
        'fade-in': {
          '0%': {
            opacity: '0',
          },
          '20%': {
            opacity: '0.6',
          },
          '100%': {
            opacity: '1',
          },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
        'slide-in': {
          '0%': {
            transform: 'translateY(100%)',
          },
          '100%': {
            transform: 'translateY(0)',
          },
        },
        'slide-out': {
          '0%': {
            transform: 'translateY(0)',
          },
          '100%': {
            transform: 'translateY(100%)',
          },
          // Tooltip
          "slide-up-fade": {
            "0%": { opacity: 0, transform: "translateY(6px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
          "slide-down-fade": {
            "0%": { opacity: 0, transform: "translateY(-6px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        },
        gauge_fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        gauge_fill: {
          from: { "stroke-dashoffset": "332", opacity: "0" },
          to: { opacity: "1" },
        },
        circle1: {
          "0%": { opacity: "0.1" },
          "10%": { opacity: "0.6" },
          "20%": { opacity: "0.6" }, // Hold until circle2 starts fading in
          "30%": { opacity: "0.5" },
          "40%": { opacity: "0.5" }, // Hold until circle3 starts fading in
          "50%": { opacity: "0.4" },
          "60%": { opacity: "0.4" }, // Hold until circle4 starts fading in
          "70%": { opacity: "0.3" },
          "80%": { opacity: "0.3" }, // Hold until circle5 starts fading in
          "90%": { opacity: "0.2" },
          "100%": { opacity: "0.1" },
        },
        circle2: {
          "0%": { opacity: "0.1" },
          "20%": { opacity: "0.1" },
          "30%": { opacity: "0.6" },
          "40%": { opacity: "0.6" },
          "50%": { opacity: "0.5" },
          "60%": { opacity: "0.5" },
          "70%": { opacity: "0.4" },
          "80%": { opacity: "0.4" },
          "90%": { opacity: "0.3" },
          "100%": { opacity: "0.1" },
        },
        circle3: {
          "0%": { opacity: "0.1" },
          "40%": { opacity: "0.1" },
          "50%": { opacity: "0.6" },
          "60%": { opacity: "0.6" },
          "70%": { opacity: "0.5" },
          "80%": { opacity: "0.5" },
          "90%": { opacity: "0.4" },
          "100%": { opacity: "0.1" },
        },
        circle4: {
          "0%": { opacity: "0.1" },
          "60%": { opacity: "0.1" },
          "70%": { opacity: "0.6" },
          "80%": { opacity: "0.6" },
          "90%": { opacity: "0.5" },
          "100%": { opacity: "0.1" },
        },
        circle5: {
          "0%": { opacity: "0.1" },
          "80%": { opacity: "0.1" },
          "85%": { opacity: "0.6" },
          "100%": { opacity: "0.1" }, // Slow fade out from 90% to 100%
        },
      },
      letterSpacing: {
        tightest: '-.075em',
        tighter: '-.05em',
        tight: '-.025em',
        normal: '0',
        wide: '.025em',
        wider: '.05em',
        widest: '.1em',
      },
      boxShadow: {
        'widget-footer': '-1px -28px 21px -6px var(--ls-colors-secondary-900, #0C1527)',
        'card': '5px 5px 40px rgba(0, 0, 0, 0.2), 0px 0px 20px rgba(0, 0, 0, 0.43)',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            h1: {
              color: '#FFF',
              textAlign: 'center',
            },
            h2: {
              color: '#FFF',
              textAlign: 'center',
            },
            h3: {
              color: '#FFF',
            },
            h4: {
              color: '#FFF',
            },
            h5: {
              color: '#FFF',
            },
            a: {
              color: theme('colors.primary.400'),
            },
            strong: {
              color: '#FFF'
            },
            blockquote: {
              color: '#FFF'
            }
          },
        }
      }),
    },
  },
  variants: {
    extend: {
      opacity: ["disabled"],
      cursor: ["hover", "focus", "disabled"],
      backgroundColor: ["disabled"],
      translate: ["hover"],
      display: ["group-hover"],
      fill: ['hover', 'focus']
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
    plugin(function ({ addVariant }) {
      // Add a `third` variant, ie. `third:pb-0`
      addVariant('scrollbar', '&::-webkit-scrollbar');
      addVariant('scrollbar-thumb', '&::-webkit-scrollbar-thumb')
      addVariant('focus-peer', '.focus-peer &')
      addVariant('wide-page', '.wide-page &')
    })
  ],
};
