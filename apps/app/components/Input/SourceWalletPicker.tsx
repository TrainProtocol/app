import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Dispatch, FC, SetStateAction, useCallback, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useProvidersConnectReady } from "@layerswap/ui-kit";
import { Address } from "@/lib/address";
import { ChevronDown } from "lucide-react";
import { WalletIcon } from "@layerswap/ui-kit/components";
import VaulDrawer from "../Modal/vaulModal";
import type { Wallet } from "@layerswap/widget-types";
import { SelectAccountProps } from "@layerswap/ui-kit/types";
import SubmitButton from "@/components/buttons/submitButton";
import { useConnectModal } from "../WalletModal";
import WalletsList from "@/components/Wallet/WalletsList";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import WalletIconView from "@/components/Wallet/WalletIconView";

const SourceWalletPicker: FC = () => {
    const [openModal, setOpenModal] = useState<boolean>(false)

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const source_token = values.fromCurrency
    const selectSourceAccount = useSelectSwapAccount("from");

    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", values.from?.caip2Id);

    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = useCallback((props?: SelectAccountProps) => {
        if (props) {
            selectSourceAccount({
                id: props.walletId,
                address: props.address,
                providerName: props.providerName
            })
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setFieldValue('depositMethod', 'deposit_address')
        }
        setOpenModal(false)
    }, [provider, setFieldValue, selectSourceAccount])

    if (!values.from || !source_token)
        return <></>

    return <>
        <span>
            {
                selectedSourceAccount && selectedSourceAccount?.address &&
                <button type="button" onClick={handleWalletChange} className="rounded-lg flex items-center space-x-2 text-sm hover:bg-secondary-300 py-1 pl-2 pr-2 outline-hidden">
                    <div className="rounded-lg flex space-x-1 items-center">
                        <div className="inline-flex items-center relative px-0.5">
                            <WalletIconView wallet={selectedSourceAccount} className="w-4 h-4 rounded" />
                        </div>
                        <div className="text-secondary-text">
                            {new Address(selectedSourceAccount.address, values.from).toShortString()}
                        </div>
                        <div className="w-4 h-4 items-center flex text-secondary-text">
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </div>
                    </div>
                </button>
            }
        </span>
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header='Send from'
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap
                id="item-1"
                className="pb-4 flex flex-col gap-3"
            >
                <div
                    className="w-full order-1"
                >
                    <WalletsList
                        provider={provider}
                        wallets={availableWallets}
                        onSelect={handleSelectWallet}
                        token={source_token}
                        network={values.from}
                        selectable
                    />
                </div>
            </VaulDrawer.Snap >
        </VaulDrawer>
    </>
}

export const FormSourceWalletButton: FC<{ isDisabled?: boolean }> = ({ isDisabled }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)
    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();


    const walletNetwork = values.from
    const { provider } = useWallet(walletNetwork, 'withdrawal')

    const { cancel, connect } = useConnectModal()

    const selectSourceAccount = useSelectSwapAccount("from");

    const handleWalletChange = () => {
        setOpenModal(true)
    }

    const handleSelectWallet = (props?: SelectAccountProps) => {
        if (props?.address) {
            selectSourceAccount({
                address: props.address,
                id: props.walletId,
                providerName: props.providerName
            });
            setFieldValue('depositMethod', 'wallet')
        }
        else {
            setFieldValue('depositMethod', 'deposit_address')
        }
        cancel()
        setOpenModal(false)
    }

    const handleConnect = async () => {
        const result = await connect(provider)
        if (result) {
            selectSourceAccount({
                id: result.id,
                address: result.address,
                providerName: result.providerName
            })
        }
    }
    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []

    if (!availableWallets.length && walletNetwork) {
        return <Connect connectFn={handleConnect} isDisabled={isDisabled} />

    }
    else if (availableWallets.length > 0 && walletNetwork && values.fromCurrency) {
        return <>
            <button type="button" className="w-full outline-hidden" onClick={handleWalletChange}>
                <Connect isDisabled={isDisabled} />
            </button>
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header={`Send from`}
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1" className="space-y-3 pb-3">
                    <WalletsList
                        provider={provider}
                        wallets={availableWallets}
                        onSelect={handleSelectWallet}
                        token={values.fromCurrency}
                        network={walletNetwork}
                        selectable
                    />
                </VaulDrawer.Snap>
            </VaulDrawer >
        </>
    }
    return <Connect isDisabled={isDisabled} />
}

const Connect: FC<{ connectFn?: () => Promise<Wallet | undefined | void>; isDisabled?: boolean }> = ({ connectFn, isDisabled }) => {
    const { connect } = useConnectModal()
    const isProvidersReady = useProvidersConnectReady()

    const connectWallet = async () => {
        await connect()
    }

    return <SubmitButton
        onClick={() => connectFn ? connectFn() : connectWallet()}
        type="button"
        data-attr="connect-wallet"
        icon={<WalletIcon className="h-6 w-6" strokeWidth={2} />}
        isDisabled={!isProvidersReady || isDisabled}
    >
        Connect a wallet
    </SubmitButton>
}

export default SourceWalletPicker
