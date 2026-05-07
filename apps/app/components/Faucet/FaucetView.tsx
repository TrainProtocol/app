"use client"

import { FC, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { ExtendedNetwork } from "@/Models/Network"
import { Address, getExplorerUrl } from "@/lib/address"
import { getFaucetNetworks, claimFaucet, getClaimStatus, FaucetApiError } from "@/lib/faucet/api"
import useWallet from "@/hooks/useWallet"
import { useSettingsState } from "@/context/settings"
import { Widget } from "@/components/Widget/Index"
import { useConnectModal } from "@/components/WalletModal"
import HeaderWithMenu from "@/components/HeaderWithMenu"
import SubmitButton from "@/components/buttons/submitButton"
import WalletIcon from "@/components/Icons/WalletIcon"
import WalletMessage from "@/components/Swap/messages/Message"
import FaucetNetworkSelector from "./FaucetNetworkSelector"
import FaucetWalletPicker from "./FaucetWalletPicker"

const FaucetView: FC = () => {
    const [network, setNetwork] = useState<ExtendedNetwork | null>(null)
    const [recipient, setRecipient] = useState<string | null>(null)
    const { networks } = useSettingsState()
    const { data: faucetNetworks } = useSWR("faucet-networks", getFaucetNetworks)

    const faucetByCaip2Id = useMemo(
        () => new Map((faucetNetworks ?? []).map(f => [f.caip2Id, f])),
        [faucetNetworks],
    )
    const availableNetworks = useMemo(
        () => networks.filter(n => faucetByCaip2Id.has(n.caip2Id)),
        [networks, faucetByCaip2Id],
    )

    const [posting, setPosting] = useState(false)
    const [postError, setPostError] = useState<Error | null>(null)
    const [correlationId, setCorrelationId] = useState<string | null>(null)

    const { data: claimStatus } = useSWR(
        correlationId ? ["faucet-claim-status", correlationId] : null,
        ([, id]) => getClaimStatus(id),
        { refreshInterval: (data) => (data?.txHash || data?.failureReason) ? 0 : 2000 },
    )

    const { provider, unAvailableWallets } = useWallet(network, "withdrawal")
    const { connect } = useConnectModal()

    const availableWallets = useMemo(
        () => provider?.connectedWallets?.filter(w => !w.isNotAvailable) ?? [],
        [provider?.connectedWallets],
    )
    const hasWallet = availableWallets.length > 0

    useEffect(() => {
        if (!recipient && availableWallets.length > 0) {
            setRecipient(availableWallets[0].address)
        }
    }, [availableWallets, recipient])

    useEffect(() => {
        setPostError(null)
        setCorrelationId(null)
    }, [network?.caip2Id, recipient])

    const claimDone = !!(claimStatus?.txHash || claimStatus?.failureReason)
    const submitting = posting || (correlationId !== null && !claimDone)
    const errorMessage = (() => {
        if (postError instanceof FaucetApiError && postError.status === 429) {
            const match = postError.message.match(/Try again in (\d+) seconds/i)
            if (match) {
                const minutes = Math.ceil(parseInt(match[1], 10) / 60)
                return `Faucet limit reached. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
            }
            return "Faucet limit reached. Try again later."
        }
        if (postError instanceof Error) return postError.message
        return claimStatus?.failureReason ?? null
    })()
    const successTxHash = !errorMessage && claimStatus?.txHash ? claimStatus.txHash : null
    const txLink = network && successTxHash
        ? getExplorerUrl(network.explorerUrlTemplate?.transaction, successTxHash)
        : undefined

    const handleConnect = async () => {
        if (!provider) return
        const wallet = await connect(provider)
        if (wallet?.address) setRecipient(wallet.address)
    }

    const onMint = async () => {
        if (!network || !recipient) return
        if (!Address.isValid(recipient, network)) return
        const faucet = faucetByCaip2Id.get(network.caip2Id)
        const token = faucet?.tokens[0]
        if (!token) return
        setPosting(true)
        setPostError(null)
        setCorrelationId(null)
        try {
            const { correlationId: id } = await claimFaucet({
                caip2Id: network.caip2Id,
                tokenContract: token.contract,
                recipientAddress: recipient,
            })
            setCorrelationId(id)
        } catch (err) {
            setPostError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setPosting(false)
        }
    }

    const showConnect = !!network && !hasWallet
    const buttonLabel = showConnect ? "Connect a wallet" : "Mint"
    const buttonIcon = showConnect ? <WalletIcon className="h-6 w-6" strokeWidth={2} /> : undefined
    const buttonAction = showConnect ? handleConnect : onMint
    const buttonDisabled = showConnect ? !provider : !network || !recipient || submitting

    return (
        <Widget hideMenu>
            <div className="sm:hidden">
                <HeaderWithMenu goBack={null} />
            </div>
            <div className="flex flex-col min-h-[400px] h-full">
                <div className="space-y-1 pt-4">
                    <h1 className="text-primary-text text-xl font-semibold">Faucet</h1>
                    <p className="text-secondary-text text-sm">Mint test tokens to your wallet on a supported testnet.</p>
                </div>
                <div className="space-y-3 mt-4">
                    <FaucetNetworkSelector
                        networks={availableNetworks}
                        value={network}
                        onChange={setNetwork}
                        disabled={submitting}
                    />
                    <FaucetWalletPicker
                        network={network}
                        wallets={availableWallets}
                        notCompatibleWallets={unAvailableWallets}
                        provider={provider}
                        value={recipient}
                        onChange={setRecipient}
                        disabled={submitting}
                    />
                </div>
                <div className="mt-auto pt-6 space-y-3">
                    {errorMessage && (
                        <WalletMessage status="error" header="Mint failed" details={errorMessage} />
                    )}
                    {successTxHash && (
                        <WalletMessage
                            status="success"
                            header="Tokens sent"
                            details={txLink ? (
                                <a
                                    href={txLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    onClick={() => setCorrelationId(null)}
                                >
                                    View transaction
                                </a>
                            ) : null}
                        />
                    )}
                    <SubmitButton
                        type="button"
                        onClick={buttonAction}
                        isDisabled={buttonDisabled}
                        isSubmitting={submitting}
                        icon={buttonIcon}
                    >
                        {buttonLabel}
                    </SubmitButton>
                </div>
            </div>
        </Widget>
    )
}

export default FaucetView
