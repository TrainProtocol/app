import "../styles/globals.css";
import "../styles/dialog-transition.css";
import "../styles/vaul.css";
import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/getSettings";
import { Providers } from "./providers";

const title = "TRAIN I The First Scalable Cross-Chain Bridge";
const description = "The trustless and permissionless way of cross-chain asset bridging & swapping. Move assets across blockchains without third parties, secured by a battle-tested system.";

export const metadata: Metadata = {
    metadataBase: new URL("https://app.train.tech"),
    title,
    description,
    alternates: { canonical: "/" },
    icons: {
        icon: [
            { url: "/favicon/favicon-96x96.png", type: "image/png", sizes: "96x96" },
            { url: "/favicon/favicon.svg", type: "image/svg+xml" },
        ],
        shortcut: "/favicon/favicon.ico",
        apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
    },
    manifest: "/favicon/site.webmanifest",
    openGraph: {
        type: "website",
        url: "/",
        title,
        description,
        images: [{ url: "/opengraph.jpg?v=2" }],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/opengraphtw.jpg"],
    },
    other: {
        "apple-mobile-web-app-title": title,
        "msapplication-TileColor": "#ffffff",
        "twitter:domain": "app.train.tech",
        "twitter:url": "https://app.train.tech/",
    },
};

export const viewport: Viewport = {
    themeColor: "rgb(var(--ls-colors-secondary-900))",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const settings = await getSettings();
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers settings={settings}>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
