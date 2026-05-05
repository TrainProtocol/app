"use client"

import { FC, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { useConfig, type Config, type Connector } from "wagmi"
import { getConnections, getWalletClient } from "wagmi/actions"
import { createPublicClient, encodeFunctionData, http, parseUnits } from "viem"
import { ExtendedNetwork } from "@/Models/Network"
import { Address } from "@/lib/address"
import resolveChain from "@/lib/resolveChain"
import useWallet from "@/hooks/useWallet"
import { FAUCET_CONTRACTS } from "@/lib/faucet/contracts"
import { FAUCET_ABI } from "@/lib/faucet/abi"
import { Widget } from "@/components/Widget/Index"
import { useConnectModal } from "@/components/WalletModal"
import HeaderWithMenu from "@/components/HeaderWithMenu"
import SubmitButton from "@/components/buttons/submitButton"
import WalletIcon from "@/components/Icons/WalletIcon"
import VaulDrawer from "@/components/Modal/vaulModal"
import FaucetNetworkSelector from "./FaucetNetworkSelector"
import FaucetWalletPicker from "./FaucetWalletPicker"
import FaucetAmountInput from "./FaucetAmountInput"
import FaucetMintProgress, { MintAttempt } from "./FaucetMintProgress"

const RECEIPT_TIMEOUT_MS = 60_000

type Signer = { address: string; connector: Connector }

async function sendWithChainSwitch(send: () => Promise<`0x${string}`>, connector: Connector, chainId: number): Promise<`0x${string}`> {
    try {
        return await send()
    } catch (e) {
        const isChainMismatch = e instanceof Error && (
            e.name === 'ChainMismatchError' ||
            (e.cause instanceof Error && e.cause.name === 'ChainMismatchError')
        )
        if (!isChainMismatch || !connector.switchChain) throw e
        await connector.switchChain({ chainId })
        return await send()
    }
}

function findSignerForRecipient(config: Config, recipient: string): Signer | null {
    const lower = recipient.toLowerCase()
    const connections = getConnections(config)
    const matched = connections.find(c => c.accounts.some(a => a.toLowerCase() === lower))
    const connection = matched ?? connections[0]
    if (!connection) return null
    const signerAddress = matched
        ? connection.accounts.find(a => a.toLowerCase() === lower)!
        : connection.accounts[0]
    return { address: signerAddress, connector: connection.connector }
}

function isUserRejection(err: unknown): boolean {
    if (!(err instanceof Error)) return false
    if (err.name === 'UserRejectedRequestError') return true
    const cause = err.cause
    if (cause instanceof Error && cause.name === 'UserRejectedRequestError') return true
    return /user rejected|user denied|USER_REFUSED_OP/i.test(err.message)
}

const FaucetView: FC = () => {
    const [network, setNetwork] = useState<ExtendedNetwork | null>(null)
    const [recipient, setRecipient] = useState<string | null>(null)
    const [amount, setAmount] = useState<string>("")
    const [mint, setMint] = useState<MintAttempt | null>(null)

    const config = useConfig()
    const { provider, unAvailableWallets } = useWallet(network, "withdrawal")
    const { connect } = useConnectModal()

    const availableWallets = useMemo(
        () => provider?.connectedWallets?.filter(w => !w.isNotAvailable) ?? [],
        [provider?.connectedWallets],
    )
    const hasWallet = availableWallets.length > 0

    useEffect(() => {
        if (recipient === null && availableWallets.length > 0) {
            setRecipient(availableWallets[0].address)
        }
    }, [availableWallets, recipient])

    const { data: token } = useSWR(
        network ? ['faucet-token', network.caip2Id] : null,
        async () => {
            const faucet = FAUCET_CONTRACTS.find(c => c.caip2Id === network!.caip2Id)
            const chain = faucet && resolveChain(network!)
            if (!faucet || !chain) return null
            const client = createPublicClient({ chain, transport: http() })
            const [symbol, decimals] = await Promise.all([
                client.readContract({ address: faucet.faucetAddress, abi: FAUCET_ABI, functionName: 'symbol' }),
                client.readContract({ address: faucet.faucetAddress, abi: FAUCET_ABI, functionName: 'decimals' }),
            ])
            return { caip2Id: network!.caip2Id, symbol, decimals }
        },
    )
    const tokenForCurrentNetwork = token && network && token.caip2Id === network.caip2Id ? token : null

    const amountNum = Number(amount)
    const submitting = !!mint && mint.phase !== 'success' && !mint.error

    const handleConnect = async () => {
        if (!provider) return
        const wallet = await connect(provider)
        if (wallet?.address) setRecipient(wallet.address)
    }

    const updateMint = (patch: Partial<MintAttempt>) => setMint(m => m && { ...m, ...patch } as MintAttempt)
    const fail = (error: string) => updateMint({ error })

    const closeDrawer = () => {
        if (submitting) return
        setMint(null)
    }

    const onMint = async () => {
        if (!network || !recipient || !amount || !tokenForCurrentNetwork) return
        if (!/^0x[0-9a-fA-F]{40}$/.test(recipient) || !Address.isValid(recipient, network)) return
        const recipientHex = recipient as `0x${string}`
        const faucet = FAUCET_CONTRACTS.find(c => c.caip2Id === network.caip2Id)
        const chain = faucet && resolveChain(network)
        if (!faucet || !chain) return

        setMint({ phase: 'preparing', network, recipient, symbol: tokenForCurrentNetwork.symbol, amount })

        const signer = findSignerForRecipient(config, recipient)
        if (!signer) return fail('No wallet connected to sign the transaction')

        try {
            const walletClient = await getWalletClient(config, { chainId: chain.id, account: signer.address as `0x${string}`, connector: signer.connector })
            updateMint({ phase: 'awaiting_signature' })

            const hash = await sendWithChainSwitch(
                () => walletClient.sendTransaction({
                    to: faucet.faucetAddress,
                    data: encodeFunctionData({ abi: FAUCET_ABI, functionName: 'mint', args: [recipientHex, parseUnits(amount, tokenForCurrentNetwork.decimals)] }),
                    chain,
                    account: walletClient.account,
                }),
                signer.connector,
                chain.id,
            )
            updateMint({ phase: 'confirming', txHash: hash })

            const publicClient = createPublicClient({ chain, transport: http() })
            try {
                const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS, confirmations: 1 })
                if (receipt.status === 'success') updateMint({ phase: 'success' })
                else fail('Transaction reverted')
            } catch (err) {
                if (err instanceof Error && err.name === 'WaitForTransactionReceiptTimeoutError') {
                    fail('Timed out waiting for confirmation. The transaction may still be pending — check the explorer.')
                } else {
                    throw err
                }
            }
        } catch (err) {
            console.error(err)
            if (isUserRejection(err)) {
                setMint(null)
                return
            }
            fail(err instanceof Error ? err.message : 'Mint failed')
        }
    }

    const showConnect = !!network && !hasWallet
    const buttonLabel = showConnect ? "Connect a wallet" : "Mint"
    const buttonIcon = showConnect ? <WalletIcon className="h-6 w-6" strokeWidth={2} /> : undefined
    const buttonAction = showConnect ? handleConnect : onMint
    const buttonDisabled = showConnect ? !provider : !network || !recipient || !tokenForCurrentNetwork || amountNum <= 0 || submitting

    return (
        <>
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
                        <FaucetNetworkSelector value={network} onChange={setNetwork} />
                        <FaucetWalletPicker
                            network={network}
                            wallets={availableWallets}
                            notCompatibleWallets={unAvailableWallets}
                            provider={provider}
                            value={recipient}
                            onChange={setRecipient}
                        />
                        <FaucetAmountInput value={amount} onChange={setAmount} disabled={!network} symbol={tokenForCurrentNetwork?.symbol} />
                    </div>
                    <div className="mt-auto pt-6">
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

            <VaulDrawer
                mode="fitHeight"
                show={!!mint}
                setShow={open => { if (!open) closeDrawer() }}
                header="Mint test tokens"
                modalId="faucetMint"
                className="expandContainerHeight"
            >
                {mint && <FaucetMintProgress attempt={mint} onClose={closeDrawer} />}
            </VaulDrawer>
        </>
    )
}

export default FaucetView
