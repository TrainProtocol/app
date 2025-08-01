import { WalletIcon } from "lucide-react";
import { FC, ReactNode, useCallback, useState } from "react";
import useWallet from "../../hooks/useWallet";
import { Network } from "../../Models/Network";
import toast from "react-hot-toast";
import SubmitButton, { SubmitButtonProps } from "../buttons/submitButton";
import ButtonStatus from "./AtomicChat/Actions/Status/ButtonStatus";
import WalletMessage from "./messages/Message";
import { useAtomicState } from "../../context/atomicContext";
import { useConnectModal } from "../WalletModal";
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

            if (!provider) throw new Error(`No provider from ${network?.name}`)

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

    const { selectedSourceAccount } = useAtomicState()

    const clickHandler = useCallback(async () => {
        try {
            setIsPending(true)
            if (!provider) throw new Error(`No provider from ${network?.name}`)
            if (!provider.switchChain) throw new Error(`No switchChain from ${network?.name}`)
            if (!selectedSourceAccount?.wallet) throw new Error(`No selectedSourceAccount from ${network?.name}`)

            return await provider.switchChain(selectedSourceAccount?.wallet, chainId)
        } catch (e) {
            setError(e)
        } finally {
            setIsPending(false)
        }

    }, [provider, chainId])

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

export const WalletActionButton: FC<LockButtonProps> = (props) => {
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
