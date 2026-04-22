import "../styles/globals.css";
import "../styles/dialog-transition.css";
import "../styles/vaul.css";
import { getSettings } from "@/lib/getSettings";
import { Providers } from "./providers";

export const dynamic = "force-dynamic";

const title = "TRAIN I The First Scalable Cross-Chain Bridge";
const description = "The trustless and permissionless way of cross-chain asset bridging & swapping. Move assets across blockchains without third parties, secured by a battle-tested system.";

const cookieCheckScript = `if(typeof window !== "undefined" && !window.location.pathname.includes("nocookies")){try { localStorage.getItem("ls-ls-test"); }catch (e) { window.location.href = "/nocookies"; }}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const settings = await getSettings();
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <title>{title}</title>
                <link rel="icon" type="image/png" href="favicon/favicon-96x96.png" sizes="96x96" />
                <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
                <link rel="shortcut icon" href="/favicon/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
                <meta name="apple-mobile-web-app-title" content={title} />
                <link rel="manifest" href="/favicon/site.webmanifest" />
                <link rel="canonical" href="https://app.train.tech/" />
                <meta name="msapplication-TileColor" content="#ffffff" />
                <meta name="theme-color" content="rgb(var(--ls-colors-secondary-900))" />
                <meta name="description" content={description} />

                {/* Facebook Meta Tags */}
                <meta property="og:url" content="https://app.train.tech/" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:image" content="https://app.train.tech/opengraph.jpg?v=2" />

                {/* Twitter Meta Tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta property="twitter:domain" content="app.train.tech" />
                <meta property="twitter:url" content="https://app.train.tech/" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                <meta name="twitter:image" content="https://app.train.tech/opengraphtw.jpg" />

                <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: cookieCheckScript }} />
            </head>
            <body>
                <Providers settings={settings}>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
