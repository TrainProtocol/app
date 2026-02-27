import { useConnectModal } from '@/components/WalletModal';
import useWallet from '@/hooks/useWallet';
import { Wallet } from '@/Models/WalletProvider';
import { Fingerprint, Wallet as WalletIcon } from 'lucide-react';
import { useSecretDerivation } from '@/context/secretDerivationContext';

const OptionSelect = ({ onPasskeyLogin, goToStep, onConnectFinish }: {
    onPasskeyLogin: () => void;
    goToStep: (step: string) => void;
    onConnectFinish: (wallet?: Wallet) => void;
}) => {
    const { connect } = useConnectModal();
    const { providers } = useWallet();
    const { prfSupportDetails } = useSecretDerivation();

    const evmProvider = providers.find(p => p.name.toLowerCase() === 'evm');
    const connectedWallets = evmProvider?.connectedWallets || [];

    const selectWallet = async () => {
        if (connectedWallets.length < 1) {
            const wallet = await connect(evmProvider);

            if (wallet) {
                onConnectFinish(wallet);
                return
            }
        }
        goToStep('wallet_select')
    }

    const passkeyDisabled = prfSupportDetails && !prfSupportDetails.supported;
    const windowsHint = prfSupportDetails?.platformHint === 'windows_hello_no_prf';

    const passkeyDescription = passkeyDisabled
        ? (prfSupportDetails?.reason || "Not supported on this device")
        : windowsHint
            ? "Requires a security key on Windows"
            : "Face ID, Touch ID, or security key";

    const walletDescription = passkeyDisabled
        ? "Recommended for this device"
        : "Select or connect an EVM wallet";

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-secondary-text">Choose how to login.</p>
            <OptionItem
                onClick={passkeyDisabled ? undefined : onPasskeyLogin}
                icon={Fingerprint}
                title="Passkey"
                description={passkeyDescription}
                disabled={!!passkeyDisabled}
            />
            <OptionItem
                onClick={selectWallet}
                icon={WalletIcon}
                title="Wallet (EVM)"
                description={walletDescription}
            />
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
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 ${disabled
                    ? 'border-secondary-800 bg-secondary-900 opacity-50 cursor-not-allowed'
                    : 'border-secondary-700 bg-secondary-800 hover:border-secondary-600'
                }`}
        >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-secondary-500 flex items-center justify-center">
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