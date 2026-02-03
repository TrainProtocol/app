
export type ThemeData = {
    buttonTextColor?: string,
    logo?: string,
    tertiary?: string,
    primary?: ThemeColor,
    secondary?: ThemeColor,
    headerLogo?: string,
    footerLogo?: string,
    footerLogoHeight?: string,
    warning?: StatusColor,
    error?: StatusColor,
    success?: StatusColor,
    header?: {
        hideMenu?: boolean,
        hideTabs?: boolean,
        hideWallets?: boolean,
    }
    accent: {
        DEFAULT: string,
        hover: string
    }
}


export type ThemeColor = {
    DEFAULT: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
    text: string,
}

export type StatusColor = {
    Foreground: string;
    Background: string;
}

export const THEME_COLORS: { [key: string]: ThemeData } = {
    "default": {
        tertiary: '128, 128, 128',
        buttonTextColor: '0, 0, 0',
        logo: '255, 255, 255',
        primary: {
            DEFAULT: '255, 255, 255',
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
        },
        accent: {
            DEFAULT: '39, 142, 246',
            hover: '35, 128, 222'
        },
        secondary: {
            DEFAULT: '32, 59, 70',
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
            'text': '200, 200, 200',
        },
        warning: {
            Foreground: '255, 201, 74',
            Background: '47, 43, 29',
        },
        error: {
            Foreground: '255, 97, 97',
            Background: '46, 27, 27',
        },
        success: {
            Foreground: '89, 224, 125',
            Background: '14, 43, 22',
        },
    },
}