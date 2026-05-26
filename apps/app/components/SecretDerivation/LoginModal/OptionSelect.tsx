import { Fingerprint } from 'lucide-react';
import { useSharedSecretDerivation } from '@train-protocol/react';



const OptionSelect = ({ onPasskeyLogin }: {
    onPasskeyLogin: () => void;
    // goToStep: (step: string) => void;
    // onConnectFinish: (wallet?: Wallet) => void;
}) => {
    // const { connect } = useConnectModal();
    // const { providers } = useWallet();
    const { prfSupportDetails } = useSharedSecretDerivation();

    // Wallet login temporarily disabled — passkey is the default
    // const connectedWallets = useMemo(() => {
    //     const registeredProviders = getRegisteredWalletSignProviders();
    //     const loginProviders = providers.filter(p => registeredProviders.includes(p.id.toLowerCase()));
    //     return loginProviders.flatMap(p => p.connectedWallets || []);
    // }, [providers]);

    // const selectWallet = async () => {
    //     if (connectedWallets.length < 1) {
    //         const wallet = await connect();
    //         const provider = providers.find(p => p.name === wallet?.providerName)
    //         if (wallet && provider && getRegisteredWalletSignProviders().includes(provider.id.toLowerCase())) {
    //             onConnectFinish(wallet);
    //             return;
    //         }
    //     }
    //     goToStep('wallet_select')
    // }

    const passkeyDisabled = prfSupportDetails && !prfSupportDetails.supported;

    const passkeyDescription = passkeyDisabled
        ? (prfSupportDetails?.reason || "Not supported on this device")
        : "Face ID, Touch ID, or security key";

    // const walletDescription = passkeyDisabled
    //     ? "Recommended for this device"
    //     : "Select or connect a wallet";

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-secondary-text">Choose how to log in.</p>
            <OptionItem
                onClick={passkeyDisabled ? undefined : onPasskeyLogin}
                icon={Fingerprint}
                title="Passkey"
                description={passkeyDescription}
                disabled={!!passkeyDisabled}
            />
            {/* Wallet login temporarily disabled — passkey is the default */}
            {/* <OptionItem
                onClick={selectWallet}
                icon={WalletIcon}
                title="Wallet"
                description={walletDescription}
            /> */}
        </div>
    )
}


const OptionItem = ({
    onClick,
    icon: Icon,
    title,
    description,
    disabled
}: {
    onClick?: () => void;
    icon: (props: { className: string }) => React.ReactNode;
    title: string;
    description: string;
    disabled?: boolean;
}) => {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border ${disabled
                    ? 'border-secondary-500 bg-secondary-600 opacity-50 cursor-not-allowed'
                    : 'border-secondary-400 bg-secondary-500 hover:border-secondary-300'
                }`}
        >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-secondary-400 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary-text" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-primary-text">{title}</h3>
                <p className="text-sm text-secondary-text mt-0.5">{description}</p>
            </div>
        </button>
    )
}

export default OptionSelect;
