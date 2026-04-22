import { ButtonHTMLAttributes, forwardRef } from "react";
import useWallet from "../../hooks/useWallet";
import { useConnectModal } from "../WalletModal";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

const ConnectButton = forwardRef<HTMLButtonElement, Props>(function ConnectButton(
    { children, className, onClick, ...rest },
    ref
) {
    const { providers } = useWallet();
    const filteredProviders = providers.filter(p => !!p.autofillSupportedNetworks)
    const { connect } = useConnectModal()

    return (
        <button
            ref={ref}
            {...rest}
            onClick={async (e) => { onClick?.(e); await connect() }}
            type="button"
            aria-label="Connect wallet"
            disabled={filteredProviders.length == 0}
            className={`${className ?? ''} disabled:opacity-50 disabled:cursor-not-allowed `}
        >
            {children}
        </button>
    )
});

export default ConnectButton;