import { RefreshCw } from "lucide-react";
import { ResolveConnectorIcon } from "../../../../Icons/ConnectorIcons";
import { Network } from "../../../../../Models/Network";
import { FC, useState } from "react";
import { Wallet, WalletProvider } from "../../../../../Models/WalletProvider";
import { useConnectModal } from "../../../../WalletModal";

type Props = {
    provider: WalletProvider,
    onConnect?: (wallet: Wallet) => void,
}

const ConnectWalletButton: FC<Props> = ({ provider, onConnect }) => {
    const { connect } = useConnectModal()
    const [isLoading, setIsLoading] = useState(false)

    const handleConnect = async () => {
        setIsLoading(true)
        const result = await connect(provider)
        if (onConnect && result) onConnect(result)
        setIsLoading(false)
    }

    return <>
        <button typeof="button" onClick={handleConnect} type="button" className={`py-5 px-6 bg-secondary-700 hover:bg-secondary-600 transition-colors duration-200 rounded-xl ${isLoading && 'cursor-progress opacity-80'}`}>
            <div className="flex flex-row justify-between gap-9 items-stretch">
                <ResolveConnectorIcon
                    connector={provider.name}
                    iconClassName="w-10 h-10 p-0.5 rounded-lg bg-secondary-800 border border-secondary-400"
                    className="grid grid-cols-2 gap-1 min-w-fit"
                />
                <div className="h-full space-y-2">
                    <p className="text-sm font-medium text-secondary-text text-start">Connect your wallet to browse and select from your addresses</p>
                    <div className="bg-primary-700/30 border-none !text-primary py-2 rounded-lg text-base font-semibold">
                        {
                            isLoading ?
                                <div className="flex items-center gap-1 justify-center">
                                    <RefreshCw className="h-3 w-auto animate-spin" />
                                    <span className="ml-1">Connecting...</span>
                                </div>
                                :
                                <>Connect Now</>
                        }
                    </div>
                </div>
            </div>
        </button>
    </>
}

export default ConnectWalletButton