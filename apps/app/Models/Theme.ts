
export type ThemeData = {
    background?: string,
    buttonTextColor?: string,
    actionButtonColor?: string,
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
    text: string,
}

export type StatusColor = {
    Foreground: string;
    Background: string;
}

export const THEME_COLORS: { [key: string]: ThemeData } = {
    "light": {
        background: '200, 206, 222',
        tertiary: '86, 97, 123',
        buttonTextColor: '255, 255, 255',
        actionButtonColor: '39, 142, 246',
        logo: '10, 10, 10',
        primary: {
            DEFAULT: '39, 142, 246',
            '100': '220, 235, 252',
            '200': '185, 215, 248',
            '300': '150, 195, 248',
            '400': '100, 170, 247',
            '500': '39, 142, 246',
            '600': '35, 128, 222',
            '700': '30, 110, 195',
            '800': '25, 90, 165',
            '900': '20, 70, 135',
            'text': '10, 10, 10',
        },
        secondary: {
            100: "255, 255, 255",
            200: "245, 247, 252",
            300: "235, 238, 245",
            400: "223, 227, 238",
            500: "210, 215, 230",
            600: "190, 196, 214",
            700: "168, 176, 199",
            800: "140, 150, 175",
            900: "110, 121, 150",
            DEFAULT: "240, 243, 248",
            'text': '40, 50, 70',
        },
        warning: {
            Foreground: '200, 130, 0',
            Background: '255, 250, 230',
        },
        error: {
            Foreground: '220, 50, 50',
            Background: '255, 240, 240',
        },
        success: {
            Foreground: '40, 180, 80',
            Background: '235, 255, 240',
        },
    },
    "default": {
        background: '14, 14, 14',
        tertiary: '113, 113, 113',
        buttonTextColor: '0, 0, 0',
        actionButtonColor: '255, 255, 255',
        logo: '255, 255, 255',
        primary: {
            DEFAULT: '39, 142, 246',
            '100': '220, 235, 252',
            '200': '185, 215, 248',
            '300': '150, 195, 248',
            '400': '100, 170, 247',
            '500': '39, 142, 246',
            '600': '35, 128, 222',
            '700': '30, 110, 195',
            '800': '25, 90, 165',
            '900': '20, 70, 135',
            'text': '233, 233, 233',
        },
        secondary: {
            DEFAULT: '32, 31, 31',
            '100': '72, 72, 71',
            '200': '62, 61, 61',
            '300': '52, 51, 51',
            '400': '42, 41, 41',
            '500': '32, 31, 31',
            '600': '25, 25, 25',
            '700': '19, 19, 19',
            '800': '17, 17, 17',
            '900': '14, 14, 14',
            'text': '173, 170, 170',
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