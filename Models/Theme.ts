
export type ThemeData = {
    backdrop?: string,
    actionButtonText: string,
    buttonTextColor: string,
    logo: string,
    placeholderText: string,
    primary: ThemeColor,
    secondary?: ThemeColor,
    accent: {
        DEFAULT: string,
        hover: string
    }
    containerRoundness?: string,
    componentRoundness?: string,
    headerLogo?: string,
    footerLogo?: string,
    footerLogoHeight?: string,
}

export type ThemeColor = {
    DEFAULT: string;
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950?: string;
    text: string,
    textMuted?: string,
    textPlaceholder?: string,
}

export const THEME_COLORS: { [key: string]: ThemeData } = {
    "default": {
        backdrop: "102, 102, 102",
        placeholderText: '128, 128, 128',
        actionButtonText: '0, 0, 0',
        buttonTextColor: '217, 217, 217',
        containerRoundness: '24px',
        componentRoundness: '12px',
        logo: '255, 255, 255',
        footerLogo: 'none',
        primary: {
            DEFAULT: '255, 255, 255',
            '50': '255, 255, 255',
            '100': '255, 255, 255',
            '200': '255, 255, 255',
            '300': '255, 255, 255',
            '400': '255, 255, 255',
            '500': '255, 255, 255',
            '600': '227, 227, 227',
            '700': '199, 199, 199',
            '800': '171, 171, 171',
            '900': '143, 143, 143',
            '950': '129, 129, 129',
            'text': '230, 230, 230',
            'textMuted': '128, 128, 128',
            'textPlaceholder': '184, 184, 184',
        },
        accent: {
            DEFAULT: '39, 142, 246',
            hover: '35, 128, 222'
        },
        secondary: {
            DEFAULT: '32, 59, 70',
            '50': '101, 160, 185',
            '100': '87, 152, 178',
            '200': '70, 130, 154',
            '300': '58, 106, 126',
            '400': '61, 61, 61',
            '500': '51, 51, 51',
            '600': '46, 46, 46',
            '700': '38, 38, 38',
            '800': '34, 34, 34',
            '900': '27, 27, 27',
            '950': '18, 18, 18',
            'text': '217, 217, 217',
        }
    },
}