import { useConnectModal } from '@/components/WalletModal';
import useWallet from '@/hooks/useWallet';
import { Wallet } from '@/Models/WalletProvider';
import { Fingerprint, Wallet as WalletIcon } from 'lucide-react';

const OptionSelect = ({ goToStep, onConnectFinish }: { goToStep: (step: string) => void, onConnectFinish: (wallet?: Wallet) => void }) => {
    const { connect } = useConnectModal()
    const { providers } = useWallet();

    const evmProvider = providers.find(p => p.name.toLowerCase() === 'evm');
    const connectedWallets = evmProvider?.connectedWallets || [];
    
    const selectWallet = async() => {
       if(connectedWallets.length < 1) {
            const wallet = await connect(evmProvider);

            if(wallet) {
                onConnectFinish(wallet);
                return
            }
       }
       goToStep('wallet_select')
    }

    return (
        <>
            <p className="text-sm text-secondary-text">Choose how to login.</p>
            <div className="flex flex-col gap-3 mt-4">
                <OptionItem onClick={() => goToStep('passkey_choice')} icon={Fingerprint} title="Passkey" description="Face ID, Touch ID, or Windows Hello" />
                <OptionItem onClick={selectWallet} icon={WalletIcon} title="Wallet (EVM)" description="Select or connect an EVM wallet" />
            </div>
        </>
    )
}


const OptionItem = ({ onClick, icon: Icon, title, description }: { onClick: () => void, icon: (props: { className: string }) => React.ReactNode, title: string, description: string }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 border-secondary-700 bg-secondary-800 hover:border-secondary-600"
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