import { THEME, TonConnectUIProvider } from "@tonconnect/ui-react"
import { ThemeData } from "../../Models/Theme";

const TonConnectProvider = ({ children, basePath, themeData, appName }: { children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }) => {

    const rgbToHex = (rgb: string) => {
        const rgbArray = rgb.match(/\d+/g)
        function componentToHex(c: number) {
            var hex = c?.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }

        if (!rgbArray) return

        return "#" + componentToHex(Number(rgbArray[0])) + componentToHex(Number(rgbArray[1])) + componentToHex(Number(rgbArray[2]));
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
                                background: rgbToHex(themeData?.primary?.DEFAULT || ''),
                                foreground: rgbToHex(themeData?.secondary?.[800] || ''),
                            },
                            accent: rgbToHex(themeData?.primary?.DEFAULT || ''),
                            telegramButton: rgbToHex(themeData?.primary?.DEFAULT || ''),
                            icon: {
                                primary: rgbToHex(themeData?.primary?.DEFAULT || ''),
                                secondary: rgbToHex(themeData?.secondary?.text || ''),
                                tertiary: rgbToHex(themeData?.secondary?.[400] || ''),
                                success: rgbToHex(themeData?.primary?.DEFAULT || ''),
                            },
                            background: {
                                primary: rgbToHex(themeData?.secondary?.[900] || ''),
                                secondary: rgbToHex(themeData?.secondary?.[800] || ''),
                                segment: rgbToHex(themeData?.secondary?.[200] || ''),
                                tint: rgbToHex(themeData?.secondary?.[700] || ''),
                                qr: '#f1f1f1f1',
                            },
                            text: {
                                primary: rgbToHex(themeData?.primary?.text || ''),
                                secondary: rgbToHex(themeData?.secondary?.text || ''),
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