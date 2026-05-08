"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { ExtendedNetwork } from "@/Models/Network"
import { Address, getExplorerUrl } from "@/lib/address"
import { getFaucetNetworks, claimFaucet, getClaimStatus, FaucetApiError, FaucetToken } from "@/lib/faucet/api"
import useWallet from "@/hooks/useWallet"
import { useSettingsState } from "@/context/settings"
import { Widget } from "@/components/Widget/Index"
import HeaderWithMenu from "@/components/HeaderWithMenu"
import SubmitButton from "@/components/buttons/submitButton"
import WalletMessage from "@/components/Swap/messages/Message"
import FaucetNetworkSelector from "./FaucetNetworkSelector"
import FaucetWalletPicker from "./FaucetWalletPicker"
import AddTokenToWalletButton from "./AddTokenToWalletButton"

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
    const [addTokenError, setAddTokenError] = useState<string | null>(null)
    const [claim, setClaim] = useState<{
        correlationId: string
        token: FaucetToken
        network: ExtendedNetwork
        recipient: string
    } | null>(null)

    const { data: claimStatus } = useSWR(
        claim ? ["faucet-claim-status", claim.correlationId] : null,
        ([, id]) => getClaimStatus(id),
        { refreshInterval: (data) => (data?.txHash || data?.failureReason) ? 0 : 2000 },
    )

    const { provider } = useWallet(network, "withdrawal")

    const token = useMemo(() => {
        if (!network) return null
        return faucetByCaip2Id.get(network.caip2Id)?.tokens[0] ?? null
    }, [network, faucetByCaip2Id])

    const availableWallets = useMemo(
        () => provider?.connectedWallets?.filter(w => !w.isNotAvailable) ?? [],
        [provider?.connectedWallets],
    )

    const prevWalletCountRef = useRef(0)
    useEffect(() => {
        const count = availableWallets.length
        if (prevWalletCountRef.current > 0 && count === 0) setRecipient(null)
        else if (prevWalletCountRef.current === 0 && count > 0 && !recipient) setRecipient(availableWallets[0].address)
        prevWalletCountRef.current = count
    }, [availableWallets, recipient])

    useEffect(() => {
        setPostError(null)
        setAddTokenError(null)
        setClaim(null)
    }, [network?.caip2Id, recipient])

    const claimDone = !!(claimStatus?.txHash || claimStatus?.failureReason)
    const submitting = posting || (claim !== null && !claimDone)
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
    const successTxHash = !errorMessage && claim && claimStatus?.txHash ? claimStatus.txHash : null
    const txLink = claim && successTxHash
        ? getExplorerUrl(claim.network.explorerUrlTemplate?.transaction, successTxHash) ?? null
        : null
    const mintedToken = successTxHash && claim
        ? { token: claim.token, network: claim.network, recipient: claim.recipient }
        : null

    const onMint = async () => {
        if (!network || !recipient) return
        if (!Address.isValid(recipient, network)) return
        if (!token) return
        setPosting(true)
        setPostError(null)
        setAddTokenError(null)
        setClaim(null)
        try {
            const { correlationId: id } = await claimFaucet({
                caip2Id: network.caip2Id,
                tokenContract: token.contract,
                recipientAddress: recipient,
            })
            setClaim({ correlationId: id, token, network, recipient })
        } catch (err) {
            setPostError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setPosting(false)
        }
    }

    const recipientValid = !!(network && recipient && Address.isValid(recipient, network))
    const buttonDisabled = !recipientValid || submitting

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
                <div className="space-y-2 mt-4">
                    <FaucetNetworkSelector
                        networks={availableNetworks}
                        value={network}
                        onChange={setNetwork}
                        disabled={submitting}
                    />
                    <FaucetWalletPicker
                        network={network}
                        wallets={availableWallets}
                        value={recipient}
                        onChange={setRecipient}
                        disabled={submitting}
                    />
                    <FaucetMessage
                        mintError={errorMessage}
                        addTokenError={addTokenError}
                        txLink={txLink}
                        onDismiss={() => setClaim(null)}
                    />
                </div>
                <div className="mt-auto pt-6 space-y-3">
                    {mintedToken && availableWallets.length > 0 && (
                        <AddTokenToWalletButton
                            token={mintedToken.token}
                            network={mintedToken.network}
                            recipient={mintedToken.recipient}
                            onError={setAddTokenError}
                        />
                    )}
                    <SubmitButton
                        type="button"
                        onClick={onMint}
                        isDisabled={buttonDisabled}
                        isSubmitting={submitting}
                    >
                        Mint
                    </SubmitButton>
                </div>
            </div>
        </Widget>
    )
}

export default FaucetView

const FaucetMessage: FC<{
    mintError: string | null
    addTokenError: string | null
    txLink: string | null
    onDismiss: () => void
}> = ({ mintError, addTokenError, txLink, onDismiss }) => {
    if (mintError) return <WalletMessage status="error" header="Mint failed" details={mintError} />
    if (addTokenError) return <WalletMessage status="error" header="Couldn't add token" details={addTokenError} />
    if (!txLink) return null
    return <WalletMessage status="success" header="Tokens sent" details={
        <a href={txLink} target="_blank" rel="noopener noreferrer" className="underline" onClick={onDismiss}>
            View transaction
        </a>
    } />
}
