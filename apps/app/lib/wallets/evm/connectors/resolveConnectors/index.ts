import walletsData from "@/public/walletsData.json"
import { resolveWalletConnectorIndex } from "@/lib/wallets/utils/resolveWalletIcon"
import { WalletConnectWallet } from "@/Models/WalletConnectWallet"
import AppSettings from "@/lib/AppSettings"

export type { WalletConnectWallet }

const projectId = AppSettings.WalletConnectProjectId;
const wallets = Object.values(walletsData.listings)

const walletsToFilter = [
    "5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1"
]

export const resolveWallets: () => WalletConnectWallet[] = () => {

    const resolvedWallets = pickLatestBy(
        wallets,
        c => c.slug
    ).filter(w => (w.mobile.native || w.mobile.universal) && w.name && w.slug && !walletsToFilter.some(wtf => wtf == w.id)).map(wallet => {
        const w = resolveWallet(wallet)
        return w
    })

    return resolvedWallets;
}

const resolveWallet = (wallet: any) => {

    if (!wallet) {
        throw new Error(`Wallet ${wallet.name} not found`)
    }

    const isMobileSupported = !!wallet.mobile.universal || !!wallet.mobile.native
    const isWalletConnectSupported = isMobileSupported || !!wallet.desktop?.universal || !!wallet.desktop?.native
    const type = isWalletConnectSupported ? "walletConnect" : "other"

    const w: WalletConnectWallet = {
        id: wallet.slug,
        name: wallet.name,
        mobile: wallet.mobile,
        rdns: wallet.rdns ? `${wallet.rdns}.wc` : undefined,
        icon: wallet.image_url.sm,
        projectId,
        showQrModal: false,
        customStoragePrefix: wallet.slug,
        order: resolveWalletConnectorIndex(wallet.slug),
        type,
        isMobileSupported: isMobileSupported,
        hasBrowserExtension: wallet.injected != null,
        installUrl: wallet.injected != null ? wallet.app.browser ?? wallet.app.chrome : undefined,
        extensionNotFound: type == 'walletConnect',
        providerName: wallet.name
    }

    return w
}
export const walletConnectWallets = resolveWallets()

function pickLatestBy<T>(
    connectors: T[],
    keyFn: (c: T) => string
): T[] {
    const map = new Map<string, T>();
    for (const c of connectors) {
        const key = keyFn(c);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, c);
        } else {
            const a = new Date((existing as any).updatedAt);
            const b = new Date((c as any).updatedAt);
            if (b > a) {
                map.set(key, c);
            }
        }
    }
    return Array.from(map.values());
}