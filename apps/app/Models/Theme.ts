
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
