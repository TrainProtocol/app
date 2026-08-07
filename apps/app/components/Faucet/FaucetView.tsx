"use client"

import { FC, useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { ExtendedNetwork } from "@/Models/Network"
import { Address, getExplorerUrl } from "@/lib/address"
import { getFaucetNetworks, claimFaucet, getClaimStatus, FaucetApiError, FaucetToken } from "@/lib/faucet/api"
import useWallet from "@/hooks/useWallet"
import { useSettingsState } from "@/context/settings"
import { Widget } from "@/components/Widget/Index"
import { useQueryState } from "@/context/query"
import { generateFaucetInitialValues } from "@/lib/generateFaucetInitialValues"
import SubmitButton from "@/components/buttons/submitButton"
import WalletMessage from "@/components/Swap/messages/Message"
import FaucetNetworkSelector from "./FaucetNetworkSelector"
import FaucetWalletPicker from "./FaucetWalletPicker"
import AddTokenToWalletButton from "./AddTokenToWalletButton"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import Link from "next/link"
import { useFaucetNudgeStore } from "@/stores/faucetNudgeStore"
import { captureEvent } from "@/lib/faro"

const FaucetView: FC<{ hideMenu?: boolean }> = ({ hideMenu = false }) => {
    const { isMobile } = useWindowDimensions()
    return (
        <Widget mode="fit-content" hideMenu={!isMobile || hideMenu}>
            <FaucetContent />
        </Widget>
    )
}

export const FaucetContent: FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const { networks } = useSettingsState()
    const query = useQueryState()
    const { data: faucetNetworks } = useSWR("faucet-networks", getFaucetNetworks)

    const faucetByCaip2Id = useMemo(
        () => new Map((faucetNetworks ?? []).map(f => [f.caip2Id, f])),
        [faucetNetworks],
    )
    const availableNetworks = useMemo(
        () => networks.filter(n => faucetByCaip2Id.has(n.caip2Id)),
        [networks, faucetByCaip2Id],
    )
    const initial = generateFaucetInitialValues(availableNetworks, query)
    const [selectedNetwork, setSelectedNetwork] = useState<ExtendedNetwork | null>(null)
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null)
    const network = selectedNetwork ?? initial.network
    const recipient = selectedRecipient ?? initial.recipient

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
        if (prevWalletCountRef.current > 0 && count === 0) setSelectedRecipient(null)
        else if (prevWalletCountRef.current === 0 && count > 0 && !recipient) setSelectedRecipient(availableWallets[0].address)
        prevWalletCountRef.current = count
    }, [availableWallets, recipient])

    useEffect(() => {
        setPostError(null)
        setAddTokenError(null)
        setClaim(null)
    }, [network?.caip2Id, recipient])

    const claimDone = !!(claimStatus?.txHash || claimStatus?.failureReason)
    const submitting = posting || (claim !== null && !claimDone)

    const markMinted = useFaucetNudgeStore(s => s.markMinted)
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
    const recipientIsConnectedWallet = !!mintedToken && availableWallets.some(
        w => Address.equals(w.address, mintedToken.recipient, mintedToken.network),
    )

    const onMint = async () => {
        if (!network || !recipient) return
        if (!Address.isValid(recipient, network)) return
        if (!token) return
        captureEvent("faucet_mint_clicked", { network: network.caip2Id, token: token.symbol })
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
            markMinted(network.caip2Id, token.symbol)
            captureEvent("faucet_mint_submitted", { network: network.caip2Id, token: token.symbol })
        } catch (err) {
            captureEvent("faucet_mint_failed", {
                network: network.caip2Id,
                token: token.symbol,
                message: err instanceof Error ? err.message : String(err),
            })
            setPostError(err instanceof Error ? err : new Error(String(err)))
        } finally {
            setPosting(false)
        }
    }

    const recipientValid = !!(network && recipient && Address.isValid(recipient, network))
    const buttonDisabled = !recipientValid || submitting

    return (
        <div className="flex flex-col w-full space-y-3 sm:pt-4">
            {!hideTitle && <h1 className="text-primary-text text-xl font-semibold">Faucet</h1>}
            <p className="text-sm text-secondary-text leading-snug">
                Mint test tokens to your wallet on a supported testnet.
            </p>

            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Network</label>
                <FaucetNetworkSelector
                    networks={availableNetworks}
                    value={network}
                    onChange={setSelectedNetwork}
                    disabled={submitting}
                />
            </div>

            <div className="flex flex-col space-y-2">
                <label className="text-sm text-secondary-text">Recipient</label>
                <FaucetWalletPicker
                    network={network}
                    wallets={availableWallets}
                    value={recipient}
                    onChange={setSelectedRecipient}
                    disabled={submitting}
                />
            </div>

            <SubmitButton
                type="button"
                onClick={onMint}
                isDisabled={buttonDisabled}
                isSubmitting={submitting}
                size="medium"
            >
                Mint
            </SubmitButton>

            <FaucetMessage
                mintError={errorMessage}
                addTokenError={addTokenError}
                txLink={txLink}
            />

            {mintedToken && recipientIsConnectedWallet && (
                <AddTokenToWalletButton
                    token={mintedToken.token}
                    network={mintedToken.network}
                    recipient={mintedToken.recipient}
                    onError={setAddTokenError}
                />
            )}
        </div>
    )
}

export default FaucetView

const FaucetMessage: FC<{
    mintError: string | null
    addTokenError: string | null
    txLink: string | null
}> = ({ mintError, addTokenError, txLink }) => {
    if (mintError) return <WalletMessage status="error" header="Mint failed" details={mintError} />
    if (addTokenError) return <WalletMessage status="error" header="Couldn't add token" details={addTokenError} />
    if (!txLink) return null
    return <WalletMessage status="success" header="Tokens sent" details={
        <Link href={txLink} target="_blank" className="underline">
            View transaction
        </Link>
    } />
}
