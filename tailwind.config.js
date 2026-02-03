//@ts-check
import plugin from 'tailwindcss/plugin'

module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'media',
  theme: {
    extend: {
      screens: {
        'xs': { 'max': '400px' },
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

        'press-down': 'press-down 150ms ease-in-out',
        'shake': 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
        shine: 'shine 2s linear infinite',

        //pulse
        circle1: "circle1 3s ease-in-out infinite",
        circle2: "circle2 3s ease-in-out infinite",
        circle3: "circle3 3s ease-in-out infinite",
        circle4: "circle4 3s ease-in-out infinite",
        circle5: "circle5 3s ease-in-out infinite",
      },
      keyframes: {
        shine: {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        'shake': {
          '10%, 90%': {
            transform: 'translate3d(-1px, 0, 0)'
          },
          '20%, 80%': {
            transform: 'translate3d(2px, 0, 0)'
          },
          '30%, 50%, 70%': {
            transform: 'translate3d(-4px, 0, 0)'
          },
          '40%, 60%': {
            transform: 'translate3d(4px, 0, 0)'
          }
        },
        'press-down': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
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
        'widget-footer': '-1px -28px 21px -6px var(--ls-colors-secondary-700, #0C1527)',
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
      addVariant('has-openpicker', '&:has(.openpicker)')
      addVariant('has-expandContainerHeight', '&:has(.expandContainerHeight):has([data-state="open"])')
    })
  ],
};
