import { WalletIcon } from "lucide-react";
import { FC, ReactNode, useCallback, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { Network } from "../../Models/Network";
import toast from "react-hot-toast";
import SubmitButton, { SubmitButtonProps } from "../buttons/submitButton";
import ButtonStatus from "./AtomicChat/Actions/Status/ButtonStatus";
import WalletMessage from "./messages/Message";
import { useSelectedAccount } from "../../context/swapAccounts";
import { useConnectModal } from "../WalletModal";
import { ActionWrapper } from "./AtomicChat/Actions";
export type ActionData = {
    error: Error | null;
    isError: boolean;
    isPending: boolean;
}

type ConnectProps = SubmitButtonProps & {
    network: Network;
    defaultText: string;
}

// TODO implement hifgher order component for different wallet providers
export const ConnectWalletButton: FC<ConnectProps> = (props) => {
    const { network, defaultText } = props

    const { provider } = useWallet(network, 'withdrawal')
    const { connect } = useConnectModal()

    const clickHandler = useCallback(async () => {
        try {

            if (!provider) throw new Error(`No provider from ${network?.slug}`)

            await connect(provider)
        }
        catch (e) {
            toast.error(e.message)
        }

    }, [provider])

    return <ButtonWrapper
        onClick={props.onClick ?? clickHandler}
        icon={props.icon ?? <WalletIcon className="stroke-2 w-6 h-6" />}
        {...props}
    >
        {defaultText}
    </ButtonWrapper>
}

export const ChangeNetworkMessage: FC<{ data: ActionData, network: string }> = ({ data, network }) => {
    if (data.isPending) {
        return <WalletMessage
            status="pending"
            header='Network switch required'
            details="Confirm switching the network with your wallet"
        />
    }
    else if (data.isError) {
        return <WalletMessage
            status="error"
            header='Network switch failed'
            details={`Please try again or switch your wallet network manually to ${network}`}
        />
    }
}
type ChangeNetworkProps = {
    chainId: number | string,
    network: Network,
    defaultText: string
}
export const ChangeNetworkButton: FC<ChangeNetworkProps> = (props) => {
    const { chainId, network, defaultText } = props
    const { provider } = useWallet(network, 'withdrawal')
    const [error, setError] = useState<Error | null>(null)
    const [isPending, setIsPending] = useState(false)
    const selectedSourceAccount = useSelectedAccount("from", network?.slug);
    const { wallets } = useWallet(network, 'withdrawal')

    const clickHandler = useCallback(async () => {
        try {
            setIsPending(true)
            const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id)
            if (!selectedWallet) throw new Error(`No selectedWallet for ${network?.slug}`)
            if (!selectedSourceAccount) throw new Error(`No selectedSourceAccount for ${network?.slug}`)
            if (!selectedSourceAccount.provider.switchChain) throw new Error(`No switchChain from ${network?.slug}`)

            return await selectedSourceAccount.provider.switchChain(selectedWallet, chainId)
        } catch (e) {
            setError(e)
        } finally {
            setIsPending(false)
        }

    }, [selectedSourceAccount, chainId])

    return <>
        <ChangeNetworkMessage
            data={{
                isPending: isPending,
                isError: !!error,
                error
            }}
            network={network.displayName}
        />
        {
            !isPending &&
            <ButtonWrapper
                onClick={clickHandler}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {
                    error ? <span>Try again</span>
                        : <span>{defaultText}</span>
                }
            </ButtonWrapper>
        }
    </>
}

export const ButtonWrapper: FC<SubmitButtonProps> = ({
    ...props
}) => {
    return <div className="flex flex-col text-primary-text text-base space-y-2">
        <SubmitButton
            text_align='center'
            buttonStyle='filled'
            size="medium"
            {...props}
        >
            {props.children}
        </SubmitButton>
    </div>
}

type LockButtonProps = {
    isConnected: boolean,
    networkChainId: number | string | null,
    network: Network,
    activeChain: any,
    onClick: () => Promise<void>,
    children: ReactNode | undefined
}

export const Comp: FC<LockButtonProps> = (props) => {
    const { isConnected, networkChainId, network, activeChain, onClick, children } = props;
    const [isPending, setIsPending] = useState(false)

    const handleClick = async () => {
        try {
            setIsPending(true)
            await onClick()
        }
        catch (e) {
            toast.error(e.message)
        }
        finally {
            setIsPending(false)
        }
    }

    if (!isConnected) {
        return <ConnectWalletButton
            defaultText="Connect wallet"
            network={network}
        />
    }
    if (activeChain && activeChain != networkChainId && !!network && (!!networkChainId && !isNaN(Number(networkChainId)))) {
        return <ChangeNetworkButton
            chainId={networkChainId}
            network={network}
            defaultText="Change network"
        />
    }
    if (isPending) {
        return <ButtonStatus
            isLoading={isPending}
            isDisabled={isPending}
        >
            Confirm in wallet
        </ButtonStatus>
    }
    return <SubmitButton
        onClick={handleClick}
        isDisabled={isPending}
        isSubmitting={isPending}
    >
        {children}
    </SubmitButton>

}

export const WalletActionButton: FC<LockButtonProps> = (props) => {
    return <ActionWrapper>
        <Comp {...props} />
    </ActionWrapper>
}