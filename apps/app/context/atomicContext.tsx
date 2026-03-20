import { Context, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { LockDetails, LockStatus } from '../Models/phtlc/PHTLC';
import { Network, Token } from '@/Models/Network';
import { Wallet } from '@/Models/WalletProvider';
import { HTLCFromApi, HTLCTransaction, resolveHTLCStatus, IHTLCClient } from '@train-protocol/sdk';
import { SwapData, useSwapStore } from '@/stores/swapStore';
import { useShallow } from 'zustand/react/shallow';
import { resolvePersistantQueryParams } from '@/helpers/querryHelper';
import useUserLockPolling from '@/hooks/htlc/useUserLockPolling';
import useSolverLockPolling from '@/hooks/htlc/useSolverLockPolling';
import { HTLCStatus, isTerminalStatus } from '@/Models/HTLCStatus';
import useOrderStreaming from '@/hooks/useOrderStreaming';
import { useHTLCWriteClient } from '@/hooks/htlc/useHTLCWriteClient';
import { useSelectedAccount } from './swapAccounts';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address';
import { useRpcConfigStore } from '@/stores/rpcConfigStore';
import { useLightClient } from '@/hooks/htlc/useLightClient'

const AtomicStateContext = createContext<DataContextType | null>(null);

type DataContextType = HTLCState & {
    source_network?: Network,
    destination_network?: Network,
    source_asset?: Token,
    destination_asset?: Token,
    address?: string,
    amount?: number,
    hashlock?: string,
    lockTxId?: string,
    htlcStatus: HTLCStatus,
    destRedeemTx?: string,
    verifyingByLightClient?: boolean,
    lightClientPending?: boolean,
    destinationDetailsByLightClient?: { data?: LockDetails, error?: string },
    consensusVerifying: boolean,
    consensusVerified: boolean,
    srcAtomicContract?: string,
    destAtomicContract?: string,
    sourceClient?: IHTLCClient,
    destinationClient?: IHTLCClient,
    error?: { message: string, disableButton?: boolean },
    setError: (error: { message: string, disableButton?: boolean } | undefined) => void;
    setManualClaimTxId: (txId: string | undefined) => void;
    onUserLock: (hashlock: string, txId: string) => void;
    updateHTLC: (field: keyof HTLCState, value: any) => void;
}

interface HTLCState {
    sourceDetails?: LockDetails;
    solverLockDetails?: LockDetails;
    secretRevealed?: boolean;
    htlcFromApi?: HTLCFromApi;
    isTimelockExpired: boolean;
    manualClaimRequired?: boolean;
    refundTxId?: string | null;
    solver: string,
}

type CommitStatesDict = Record<string, HTLCState>;

export function AtomicProvider({ children }) {
    const router = useRouter()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const updateSwap = useSwapStore(s => s.updateSwap)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const swaps = useSwapStore(s => s.swaps)

    useEffect(() => {
        const hashlockFromUrl = router.query.hashlock as string | undefined
        if (!hashlockFromUrl || activeHashlock) return

        const swap = swaps[hashlockFromUrl]
        if (swap && !isTerminalStatus(swap.status)) {
            setActiveHashlock(hashlockFromUrl)
        }
    }, [router.query.hashlock, activeHashlock, swaps, setActiveHashlock])

    const tempSwap = useSwapStore(s => s.tempSwap)
    const commitSwap = useSwapStore(s => s.commitSwap)
    const committedSwap = useSwapStore(
        useShallow(s => activeHashlock ? s.swaps[activeHashlock] ?? null : null)
    )
    const currentSwap = tempSwap ?? committedSwap

    const address = currentSwap?.address
    const amount = currentSwap?.requestedAmount
    const destination = currentSwap?.destination
    const destination_asset = currentSwap?.destination_asset
    const source = currentSwap?.source
    const source_asset = currentSwap?.source_asset

    const hashlock = tempSwap ? currentSwap?.hashlock : (activeHashlock ?? currentSwap?.hashlock)
    const refundTxId = currentSwap?.refundTxId
    const lockTxId = currentSwap?.txId
    const solverName = currentSwap?.solver
    const srcAtomicContract = currentSwap?.srcContract
    const destAtomicContract = currentSwap?.destContract
    const destinationSolverAddress = currentSwap?.destinationSolverAddress

    const [htlcStates, setHtlcStates] = useState<CommitStatesDict>({});
    const [error, setError] = useState<{ message: string, disableButton?: boolean } | undefined>(undefined);
    const [manualClaimTxId, setManualClaimTxId] = useState<string | undefined>(undefined);

    // Restore secretRevealed from persisted swap store on hydration
    useEffect(() => {
        if (activeHashlock && committedSwap?.secretRevealed) {
            setHtlcStates(prev => {
                if (prev[activeHashlock]?.secretRevealed) return prev;
                return {
                    ...prev,
                    [activeHashlock]: {
                        ...prev[activeHashlock],
                        secretRevealed: true,
                    },
                };
            });
        }
    }, [activeHashlock, committedSwap?.secretRevealed])

    const updateHTLCState = useCallback((hashlock: string, newState: Partial<HTLCState>) => {
        setHtlcStates((prev) => ({
            ...prev,
            [hashlock]: {
                ...prev[hashlock],
                ...newState,
            },
        }));
    }, []);

    const setIsTimelockExpired = (isTimelockExpired: boolean) => {
        if (hashlock) updateHTLCState(hashlock, { isTimelockExpired });
    }

    const updateCommit = (field: keyof HTLCState, value: any) => {
        if (hashlock) updateHTLCState(hashlock, { [field]: value });
    }

    const sourceDetails = hashlock ? htlcStates[hashlock]?.sourceDetails : undefined;
    const solverLockDetails = hashlock ? htlcStates[hashlock]?.solverLockDetails : undefined;
    const secretRevealed = hashlock ? htlcStates[hashlock]?.secretRevealed : undefined;
    const htlcFromApi = hashlock ? htlcStates[hashlock]?.htlcFromApi : undefined;
    const isTimelockExpired = hashlock ? htlcStates[hashlock]?.isTimelockExpired : false;
    const manualClaimRequired = hashlock ? htlcStates[hashlock]?.manualClaimRequired : false;

    const destinationRedeemTx = manualClaimTxId ?? htlcFromApi?.transactions?.find(t => t.type === HTLCTransaction.HTLCRedeem && t.networkId === destination)?.hash

    const source_network = networks.find(n => n.caip2Id.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.caip2Id.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    useOrderStreaming({
        solverId: solverName,
        hashlock,
        enabled: !!hashlock && !!solverName && !destinationRedeemTx,
        onOrder: (order) => {
            if (hashlock) updateHTLCState(hashlock, { htlcFromApi: order })
        },
        onFailed: () => {
            if (hashlock) updateHTLCState(hashlock, { htlcFromApi: { error: { message: 'Please wait for the timelock to expire, then refund to receive your assets back.' } } })
        },
    })

    const htlcStatus = useMemo(() =>
        resolveHTLCStatus({ sourceDetails, solverLockDetails, timelockExpired: isTimelockExpired, secretRevealed, manualClaimRequired, destRedeemTxId: destinationRedeemTx }),
        [sourceDetails, solverLockDetails, isTimelockExpired, secretRevealed, manualClaimRequired, destinationRedeemTx])

    const isTerminal = isTerminalStatus(htlcStatus)

    // const { lightClientInitialized, lightClientPending, verifyingByLightClient, destinationDetailsByLightClient } = useLightClient({
    //     destination_network,
    //     destination_token,
    //     hashlock,
    //     destAtomicContract,
    //     isTerminal,
    // })

    useEffect(() => {
        if (!activeHashlock) return
        const currentSwapData = useSwapStore.getState().swaps[activeHashlock]
        if (!currentSwapData) return

        const updates: Partial<SwapData> = {}
        if (htlcStatus !== HTLCStatus.Initial && currentSwapData.status !== htlcStatus) updates.status = htlcStatus
        if (destinationRedeemTx && currentSwapData.destTxId !== destinationRedeemTx) updates.destTxId = destinationRedeemTx
        if (Object.keys(updates).length > 0) updateSwap(activeHashlock, updates)
    }, [htlcStatus, destinationRedeemTx, activeHashlock, updateSwap])

    const { provider: sourceProvider, providers } = useWallet(source_network, 'withdrawal')
    const { provider: destinationProvider } = useWallet(destination_network, 'autofill')
    const isProvidersReady = providers.every(p => p.ready)
    const createWriteClient = useHTLCWriteClient()

    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? sourceProvider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined
    const destinationAccount = useSelectedAccount('to', destination_network?.caip2Id)
    const destinationWallet = (destinationAccount?.address && destination_network) ? destinationProvider?.connectedWallets?.find(w => Address.equals(w.address, destinationAccount?.address, destination_network)) : undefined

    const sourceClient = useHTLCClientInstance(source_network, sourceWallet, isProvidersReady, createWriteClient)
    const destinationClient = useHTLCClientInstance(destination_network, destinationWallet, isProvidersReady, createWriteClient)

    const handleUserLockSuccess = useCallback((details: LockDetails) => {
        if (hashlock) {
            updateHTLCState(hashlock, { sourceDetails: details })
            const stored = useSwapStore.getState().swaps[hashlock]
            const updates: Partial<SwapData> = {}
            if (details.blockTimestamp && !stored?.createdAt) {
                updates.createdAt = details.blockTimestamp
            }
            if (details.timelock && !stored?.timelock) {
                updates.timelock = details.timelock
            }
            if (Object.keys(updates).length > 0) updateSwap(hashlock, updates)
        }
    }, [hashlock, updateSwap, updateHTLCState])

    const handleSolverLockSuccess = useCallback((details: LockDetails) => {
        if (hashlock) {
            updateHTLCState(hashlock, { solverLockDetails: details })
        }
    }, [hashlock, updateHTLCState])

    useUserLockPolling({
        network: source_network,
        hashlock,
        contractAddress: srcAtomicContract,
        sourceAsset: source_token,
        enabled: !!hashlock && !isTerminal,
        client: sourceClient,
        txId: lockTxId as string | undefined,
        onSuccess: handleUserLockSuccess,
    })

    const destRpcConfig = useRpcConfigStore(s =>
        destination_network?.caip2Id ? s.rpcConfigs[destination_network.caip2Id] : undefined
    )

    const destNodeUrls = useMemo(
        () => destination_network ? getEffectiveRpcUrls(destination_network) : [],
        [destination_network, destRpcConfig]
    )

    const handleConsensusFailed = useCallback(() => {
        setError({
            message: 'RPC node verification failed — nodes returned conflicting data. Your funds are safe and will be automatically refundable after the timelock expires.',
        })
    }, [setError])

    const { consensusVerifying, consensusVerified: isConsensusVerified } = useSolverLockPolling({
        network: destination_network,
        hashlock,
        contractAddress: destAtomicContract,
        destinationAsset: destination_token,
        enabled: !!hashlock && !isTerminal,
        client: destinationClient,
        solverAddress: destinationSolverAddress,
        onSuccess: handleSolverLockSuccess,
        onConsensusFailed: handleConsensusFailed,
        nodeUrls: destNodeUrls,
    })

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (!sourceDetails?.timelock || isTimelockExpired) return;
        if (sourceDetails.status === LockStatus.Redeemed || sourceDetails.status === LockStatus.Refunded) return;

        const timeRemaining = (Number(sourceDetails.timelock) * 1000) - Date.now();

        if (timeRemaining <= 0) {
            setIsTimelockExpired(true);
            return;
        }

        timer = setTimeout(() => {
            setIsTimelockExpired(true);
        }, timeRemaining);

        return () => clearTimeout(timer);
    }, [sourceDetails, isTimelockExpired])

    // Manual claim timer: if solver redeemed on source but not destination, wait 2 min then enable manual claim
    useEffect(() => {
        const sourceRedeemed = sourceDetails?.status === LockStatus.Redeemed;
        const hasSecret = sourceDetails?.secret && sourceDetails.secret !== 0n;
        // Require the destination lock to actually exist before checking its status —
        // solverLockDetails is undefined while polling hasn't returned yet, which would
        // otherwise incorrectly satisfy the "not redeemed" condition.
        const destLockExists = !!solverLockDetails?.sender;
        const destNotRedeemed = solverLockDetails?.status !== LockStatus.Redeemed;

        if (!sourceRedeemed || !hasSecret || !destLockExists || !destNotRedeemed || !hashlock) return;
        if (manualClaimRequired) return;

        const timer = setTimeout(() => {
            updateHTLCState(hashlock, { manualClaimRequired: true });
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearTimeout(timer);
    }, [sourceDetails?.status, sourceDetails?.secret, solverLockDetails?.sender, solverLockDetails?.status, hashlock, manualClaimRequired])

    const onUserLock = (hashlock: string, txId: string) => {
        // Move tempSwap → swaps[hashlock] in the store (also sets activeHashlock)
        commitSwap(hashlock, txId)

        // Write only hashlock to URL
        const basePath = router?.basePath || ""
        var atomicURL = window.location.protocol + "//"
            + window.location.host + `${basePath}/swap`;
        const params = resolvePersistantQueryParams(router.query)
        const atomicParams = new URLSearchParams({ hashlock })
        atomicURL += `?${atomicParams}`
        if (params && Object.keys(params).length) {
            const search = new URLSearchParams(params as any);
            atomicURL += `&${search}`
        }
        window.history.replaceState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);
    }

    return (
        <AtomicStateContext.Provider value={{
            source_network,
            onUserLock,
            source_asset: source_token,
            destination_asset: destination_token,
            address: address as string,
            amount: amount ? Number(amount) : undefined,
            destination_network,
            hashlock,
            lockTxId: lockTxId as string,
            solver: solverName as string,
            sourceDetails,
            solverLockDetails,
            secretRevealed,
            error,
            setError,
            setManualClaimTxId,
            htlcFromApi,
            htlcStatus,
            isTimelockExpired,
            refundTxId,
            destRedeemTx: destinationRedeemTx,
            consensusVerifying,
            consensusVerified: isConsensusVerified,
            srcAtomicContract,
            destAtomicContract,
            sourceClient,
            destinationClient,
            updateHTLC: updateCommit,
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

export function useAtomicState() {
    const data = useContext<DataContextType>(AtomicStateContext as Context<DataContextType>);

    if (data === undefined) {
        throw new Error('useAtomicState must be used within a MenuStateProvider');
    }

    return data;
}

function useHTLCClientInstance(
    network: Network | undefined,
    wallet: Wallet | undefined,
    isProvidersReady: boolean,
    createWriteClient: ReturnType<typeof useHTLCWriteClient>
): IHTLCClient | undefined {
    const [client, setClient] = useState<IHTLCClient | undefined>();

    useEffect(() => {
        if (!network) return;
        setClient(undefined);
        let cancelled = false;
        createWriteClient(network, isProvidersReady ? wallet : undefined)
            .then(c => { if (!cancelled) setClient(c) })
            .catch(e => console.error(`Error creating HTLC client for ${network.caip2Id}:`, e));
        return () => { cancelled = true };
    }, [network, wallet, isProvidersReady, createWriteClient]);

    return client;
}
