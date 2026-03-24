
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
        background: '246, 246, 246',
        tertiary: '130, 130, 130',
        buttonTextColor: '255, 255, 255',
        actionButtonColor: '39, 142, 246',
        logo: '23, 23, 23',
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
            'text': '23, 23, 23',
        },
        secondary: {
            100: "195, 195, 195",
            200: "210, 210, 210",
            300: "224, 224, 224",
            400: "232, 232, 232",
            500: "240, 240, 240",
            600: "245, 245, 245",
            700: "255, 255, 255",
            800: "255, 255, 255",
            900: "248, 248, 248",
            DEFAULT: "252, 252, 252",
            'text': '90, 90, 90',
        },
        warning: {
            Foreground: '180, 100, 0',
            Background: '255, 247, 230',
        },
        error: {
            Foreground: '220, 50, 50',
            Background: '255, 240, 240',
        },
        success: {
            Foreground: '22, 163, 74',
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