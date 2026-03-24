import { THEME, TonConnectUIProvider } from "@tonconnect/ui-react"

const TonConnectProvider = ({ children, basePath, appName }: { children: JSX.Element | JSX.Element[], basePath: string, appName: string | undefined }) => {

    const rgbCssVarToHex = (varName: string) => {
        if (typeof window === 'undefined') return undefined
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
        if (!value) return undefined
        const parts = value.split(',').map(s => Number(s.trim()))
        if (parts.length < 3) return undefined
        return '#' + parts.slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')
    }

    return (
        <TonConnectUIProvider
            uiPreferences={
                {
                    theme: THEME.DARK,
                    borderRadius: 's',
                    colorsSet: {
                        [THEME.DARK]: {
                            constant: {
                                black: '#000000',
                                white: '#f1f1f1f1',
                            },
                            connectButton: {
                                background: rgbCssVarToHex('--ls-colors-primary'),
                                foreground: rgbCssVarToHex('--ls-colors-secondary-800'),
                            },
                            accent: rgbCssVarToHex('--ls-colors-primary'),
                            telegramButton: rgbCssVarToHex('--ls-colors-primary'),
                            icon: {
                                primary: rgbCssVarToHex('--ls-colors-primary'),
                                secondary: rgbCssVarToHex('--ls-colors-secondary-text'),
                                tertiary: rgbCssVarToHex('--ls-colors-secondary-400'),
                                success: rgbCssVarToHex('--ls-colors-primary'),
                            },
                            background: {
                                primary: rgbCssVarToHex('--ls-colors-secondary-900'),
                                secondary: rgbCssVarToHex('--ls-colors-secondary-800'),
                                segment: rgbCssVarToHex('--ls-colors-secondary-200'),
                                tint: rgbCssVarToHex('--ls-colors-secondary-700'),
                                qr: '#f1f1f1f1',
                            },
                            text: {
                                primary: rgbCssVarToHex('--ls-colors-primary-text'),
                                secondary: rgbCssVarToHex('--ls-colors-secondary-text'),
                            }
                        }
                    }
                }
            }
            manifestUrl={`https://app.train.tech/tonconnect-manifest.json`}
        >
            {children}
        </TonConnectUIProvider>
    )
}

export default TonConnectProvider