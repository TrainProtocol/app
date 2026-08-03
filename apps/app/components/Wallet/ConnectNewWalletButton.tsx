import { Plus } from "lucide-react";

/**
 * Shared "Connect new wallet" row used by the wallet list and the route picker's
 * wallet drawer. Standardised on `rounded-lg` (the picker previously used `rounded-md`).
 */
export function ConnectNewWalletButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex justify-center p-2 bg-secondary-500 rounded-lg hover:bg-secondary-400"
        >
            <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                <Plus className="h-4 w-4" />
                <span className="text-sm">Connect new wallet</span>
            </div>
        </button>
    )
}
