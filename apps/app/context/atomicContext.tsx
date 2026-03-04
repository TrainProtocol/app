import { Context, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { LockDetails, LockStatus } from '../Models/phtlc/PHTLC';
import { Network, Token } from '@/Models/Network';
import { HTLCFromApi, HTLCTransaction } from '@train-protocol/sdk';
import LightClient from '@/lib/lightClient';
import { SwapData, useSwapStore } from '@/stores/swapStore';
import { useShallow } from 'zustand/react/shallow';
import { resolvePersistantQueryParams } from '@/helpers/querryHelper';
import useUserLockPolling from '@/hooks/htlc/useUserLockPolling';
import useSolverLockPolling from '@/hooks/htlc/useSolverLockPolling';
import { resolveHTLCStatus } from '@train-protocol/sdk';
import { createHTLCClient } from '@/lib/htlc/createHTLCClient';
import { IHTLCClient } from '@train-protocol/sdk';
import { useRpcConfigStore } from '@/stores/rpcConfigStore';
import { HTLCStatus, isTerminalStatus } from '@/Models/HTLCStatus';
import useOrderStreaming from '@/hooks/useOrderStreaming';
import { useHTLCWriteClient } from '@/hooks/htlc/useHTLCWriteClient';
import { useSelectedAccount } from './swapAccounts';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address';

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
    verifyingByLightClient: boolean,
    srcAtomicContract?: string,
    destAtomicContract?: string,
    sourceClient?: IHTLCClient,
    destinationClient?: IHTLCClient,
    error?: { message: string, buttonText?: string },
    setError: (error: { message: string, buttonText?: string } | undefined) => void;
    setManualClaimTxId: (txId: string | undefined) => void;
    setVerifyingByLightClient: (value: boolean) => void;
    onUserLock: (hashlock: string, txId: string) => void;
    updateHTLC: (field: keyof HTLCState, value: any) => void;
}

interface HTLCState {
    sourceDetails?: LockDetails;
    solverLockDetails?: LockDetails;
    destinationDetailsByLightClient?: { data?: LockDetails, error?: string };
    secretRevealed?: boolean;
    htlcFromApi?: HTLCFromApi;
    lightClient?: LightClient | undefined;
    isTimelockExpired: boolean;
    manualClaimRequired?: boolean;
    refundTxId?: string | null;
    solver: string,
}

type CommitStatesDict = Record<string, HTLCState>;

export function AtomicProvider({ children }) {
    const router = useRouter()
    const { networks } = useSettingsState()

    const activeHashlockFromStore = useSwapStore(s => s.activeHashlock)
    const activeHashlock = activeHashlockFromStore ?? router.query.hashlock as string | undefined
    const updateSwap = useSwapStore(s => s.updateSwap)

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
    const [error, setError] = useState<{ message: string, buttonText?: string } | undefined>(undefined);
    const [manualClaimTxId, setManualClaimTxId] = useState<string | undefined>(undefined);
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined);
    const [verifyingByLightClient, setVerifyingByLightClient] = useState(false)

    const [sourceClient, setSourceClient] = useState<IHTLCClient | undefined>(undefined);
    const [destinationClient, setDestinationClient] = useState<IHTLCClient | undefined>(undefined);

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
    const destinationDetailsByLightClient = hashlock ? htlcStates[hashlock]?.destinationDetailsByLightClient : undefined

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
    })

    const htlcStatus = useMemo(() =>
        resolveHTLCStatus({ sourceDetails, solverLockDetails, timelockExpired: isTimelockExpired, secretRevealed, manualClaimRequired, destRedeemTxId: destinationRedeemTx }),
        [sourceDetails, solverLockDetails, isTimelockExpired, secretRevealed, manualClaimRequired])

    const isTerminal = isTerminalStatus(htlcStatus)

    useEffect(() => {
        if (!activeHashlock) return
        const currentSwapData = useSwapStore.getState().swaps[activeHashlock]
        if (!currentSwapData) return

        const updates: Partial<SwapData> = {}
        if (htlcStatus !== HTLCStatus.Initial && currentSwapData.status !== htlcStatus) updates.status = htlcStatus
        if (destinationRedeemTx && currentSwapData.destTxId !== destinationRedeemTx) updates.destTxId = destinationRedeemTx
        if (Object.keys(updates).length > 0) updateSwap(activeHashlock, updates)
    }, [htlcStatus, destinationRedeemTx, activeHashlock, updateSwap])

    const { provider: sourceProvider } = useWallet(source_network, 'withdrawal')
    const { provider: destinationProvider } = useWallet(destination_network, 'autofill')
    const createWriteClient = useHTLCWriteClient()

    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? sourceProvider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined
    const destinationAccount = useSelectedAccount('to', destination_network?.caip2Id)
    const destinationWallet = (destinationAccount?.address && destination_network) ? destinationProvider?.connectedWallets?.find(w => Address.equals(w.address, destinationAccount?.address, destination_network)) : undefined

    useEffect(() => {
        if (!source_network || !sourceWallet) return
        (async () => {
            try {
                const client = await createWriteClient(source_network, sourceWallet)
                setSourceClient(client)
            } catch (e) {
                console.error('Error creating source HTLC client:', e)
                setSourceClient(undefined)
            }
        })()
    }, [source_network, sourceWallet, createWriteClient])
    
    useEffect(() => {
        if (!destination_network || !destinationWallet) return
        (async () => {
            try {
                const client = await createWriteClient(destination_network, destinationWallet)
                setDestinationClient(client)
            } catch (e) {
                console.error('Error creating destination HTLC client:', e)
                setDestinationClient(undefined)
            }
        })()
    }, [destination_network, destinationWallet, createWriteClient])

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

    useSolverLockPolling({
        network: destination_network,
        hashlock,
        contractAddress: destAtomicContract,
        destinationAsset: destination_token,
        enabled: !!hashlock && !isTerminal,
        client: destinationClient,
        solverAddress: destinationSolverAddress,
        onSuccess: handleSolverLockSuccess,
    })

    // useEffect(() => {
    //     if (destination_network && htlcStatus !== HTLCStatus.TimelockExpired && htlcStatus !== HTLCStatus.RedeemCompleted) {
    //         (async () => {
    //             try {
    //                 const lightClient = new LightClient()
    //                 await lightClient.initProvider({ network: destination_network })
    //                 setLightClient(lightClient)
    //             } catch (error) {
    //                 console.log(error)
    //             }

    //         })()
    //     }
    // }, [destination_network])

    // useEffect(() => {
    //     (async () => {
    //         if (destination_network && destination_token && hashlock && destination_asset && lightClient && !sourceDetails?.hashlock && destAtomicContract) {
    //             if (!lightClient.supportsNetwork(destination_network)) return

    //             try {
    //                 setVerifyingByLightClient(true)
    //                 const data = await lightClient.getDetails({
    //                     network: destination_network,
    //                     token: destination_token,
    //                     hashlock,
    //                     atomicContract: destAtomicContract
    //                 })
    //                 if (data) {
    //                     updateCommit('destinationDetailsByLightClient', { data })
    //                     return
    //                 }
    //             }
    //             catch (e) {
    //                 updateCommit('destinationDetailsByLightClient', { data: undefined, error: 'Light client is not available' })
    //                 console.log(e)
    //             }
    //             finally {
    //                 setVerifyingByLightClient(false)
    //             }
    //         }
    //     })()
    // }, [destination_network, hashlock, destAtomicContract, lightClient, destination_token, sourceDetails, destination_asset])


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
        }, 2 * 10 * 1000); // 20 seconds

        return () => clearTimeout(timer);
    }, [sourceDetails?.status, sourceDetails?.secret, solverLockDetails?.sender, solverLockDetails?.status, hashlock, manualClaimRequired])

    const handleCommited = (hashlock: string, txId: string) => {
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
            onUserLock: handleCommited,
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
            htlcFromApi: htlcFromApi,
            lightClient,
            htlcStatus,
            isTimelockExpired,
            refundTxId,
            destRedeemTx: destinationRedeemTx,
            verifyingByLightClient,
            destinationDetailsByLightClient,
            srcAtomicContract,
            destAtomicContract,
            sourceClient,
            destinationClient,
            setVerifyingByLightClient,
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

