import { Context, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { LockDetails, LockStatus } from '../Models/phtlc/PHTLC';
import { Network, Token } from '@/Models/Network';
import { HTLCFromApi, HTLCTransaction } from '@/lib/trainApiClient';
import LightClient from '@/lib/lightClient';
import { useSwapStore } from '@/stores/swapStore';
import { useShallow } from 'zustand/react/shallow';
import { resolvePersistantQueryParams } from '@/helpers/querryHelper';
import useUserLockPolling from '@/hooks/htlc/useUserLockPolling';
import useSolverLockPolling from '@/hooks/htlc/useSolverLockPolling';
import useWallet from '@/hooks/useWallet';
import useOrderPolling from '../hooks/useOrderPolling';
import { HTLCStatus } from '@/Models/HTLCStatus';
import { createPublicClient, http, Chain } from 'viem';
import resolveChain from '@/lib/resolveChain';

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
    error?: { message: string, buttonText?: string },
    setError: (error: { message: string, buttonText?: string } | undefined) => void;
    setManualClaimTxId: (txId: string | undefined) => void;
    setVerifyingByLightClient: (value: boolean) => void;
    onUserLock: (hashlock: string, txId: string) => void;
    updateHTLC: (field: keyof HTLCState, value: any) => void;
}

interface HTLCState {
    sourceDetails?: LockDetails;
    destinationDetails?: LockDetails;
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

    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
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

    const [htlcStates, setHtlcStates] = useState<CommitStatesDict>({});
    const [error, setError] = useState<{ message: string, buttonText?: string } | undefined>(undefined);
    const [manualClaimTxId, setManualClaimTxId] = useState<string | undefined>(undefined);
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined);
    const [verifyingByLightClient, setVerifyingByLightClient] = useState(false)
    const [destTxFromChain, setDestTxFromChain] = useState<string | undefined>(undefined)

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

    const updateHTLCState = (hashlock: string, newState: Partial<HTLCState>) => {
        setHtlcStates((prev) => ({
            ...prev,
            [hashlock]: {
                ...prev[hashlock],
                ...newState,
            },
        }));
    };

    const setIsTimelockExpired = (isTimelockExpired: boolean) => {
        if (hashlock) updateHTLCState(hashlock, { isTimelockExpired });
    }

    const updateCommit = (field: keyof HTLCState, value: any) => {
        if (hashlock) updateHTLCState(hashlock, { [field]: value });
    }

    const sourceDetails = hashlock ? htlcStates[hashlock]?.sourceDetails : undefined;
    const destinationDetails = hashlock ? htlcStates[hashlock]?.destinationDetails : undefined;
    const solverLockDetails = hashlock ? htlcStates[hashlock]?.solverLockDetails : undefined;
    const secretRevealed = hashlock ? htlcStates[hashlock]?.secretRevealed : undefined;
    const htlcFromApi = hashlock ? htlcStates[hashlock]?.htlcFromApi : undefined;
    const isTimelockExpired = hashlock ? htlcStates[hashlock]?.isTimelockExpired : false;
    const manualClaimRequired = hashlock ? htlcStates[hashlock]?.manualClaimRequired : false;
    const destinationDetailsByLightClient = hashlock ? htlcStates[hashlock]?.destinationDetailsByLightClient : undefined

    const destinationRedeemTx = manualClaimTxId
        ?? htlcFromApi?.transactions?.find(t => t.type === HTLCTransaction.HTLCRedeem)?.hash
        ?? destTxFromChain

    const source_network = networks.find(n => n.caip2Id.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.caip2Id.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    useOrderPolling({
        solverId: solverName,
        hashlock,
        enabled: !!hashlock && !!solverName && !destinationRedeemTx,
        onOrder: (order) => {
            if (hashlock) updateHTLCState(hashlock, { htlcFromApi: order })
        },
    })

    const htlcStatus = useMemo(() =>
        statusResolver({ sourceDetails, solverLockDetails, timelockExpired: isTimelockExpired, secretRevealed, manualClaimRequired }),
        [sourceDetails, solverLockDetails, isTimelockExpired, secretRevealed, manualClaimRequired])

    const isTerminal = htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded

    useEffect(() => {
        if (activeHashlock && isTerminal) {
            updateSwap(activeHashlock, { status: htlcStatus })
        }
    }, [htlcStatus, activeHashlock, isTerminal])

    useEffect(() => {
        if (activeHashlock && destinationRedeemTx) {
            updateSwap(activeHashlock, { destTxId: destinationRedeemTx })
        }
    }, [destinationRedeemTx, activeHashlock])

    // Fetch solver redeem tx hash directly from chain events as a reliable fallback
    useEffect(() => {
        if (
            !hashlock ||
            !destination_network ||
            !destAtomicContract ||
            solverLockDetails?.status !== LockStatus.Redeemed ||
            destTxFromChain
        ) return

        const nodeUrl = destination_network.nodes?.[0]?.url
        if (!nodeUrl) return

        const chain = resolveChain(destination_network, nodeUrl) as Chain
        const client = createPublicClient({ transport: http(nodeUrl), chain })

        client.getLogs({
            address: destAtomicContract as `0x${string}`,
            event: {
                type: 'event',
                name: 'SolverRedeemed',
                inputs: [
                    { indexed: true, name: 'hashlock', type: 'bytes32' },
                    { indexed: true, name: 'index', type: 'uint256' },
                    { indexed: false, name: 'redeemer', type: 'address' },
                    { indexed: false, name: 'secret', type: 'uint256' },
                ],
            } as const,
            args: { hashlock: hashlock as `0x${string}` },
            fromBlock: 0n,
        }).then(logs => {
            if (logs[0]) setDestTxFromChain(logs[0].transactionHash)
        }).catch(console.error)
    }, [solverLockDetails?.status, hashlock, destination_network?.caip2Id, destAtomicContract, destTxFromChain])

    const { provider } = useWallet(source_network, 'autofill')

    const { details: userLockPollData } = useUserLockPolling({
        network: source_network,
        hashlock,
        contractAddress: srcAtomicContract,
        sourceAsset: source_token,
        enabled: !!hashlock && !isTerminal,
        provider,
        txId: lockTxId as string | undefined,
    })

    const { details: solverLockPollData } = useSolverLockPolling({
        network: destination_network,
        hashlock,
        contractAddress: destAtomicContract,
        destinationAsset: destination_token,
        enabled: !!hashlock && !isTerminal,
        provider
    })

    useEffect(() => {
        if (userLockPollData && hashlock) {
            updateHTLCState(hashlock, { sourceDetails: userLockPollData })
        }
    }, [userLockPollData, hashlock])

    useEffect(() => {
        if (solverLockPollData && hashlock) {
            updateHTLCState(hashlock, { solverLockDetails: solverLockPollData })
        }
    }, [solverLockPollData, hashlock])

    useEffect(() => {
        if (destination_network && htlcStatus !== HTLCStatus.TimelockExpired && htlcStatus !== HTLCStatus.RedeemCompleted) {
            (async () => {
                try {
                    const lightClient = new LightClient()
                    await lightClient.initProvider({ network: destination_network })
                    setLightClient(lightClient)
                } catch (error) {
                    console.log(error)
                }

            })()
        }
    }, [destination_network])

    useEffect(() => {
        (async () => {
            if (destination_network && destination_token && hashlock && destination_asset && lightClient && !sourceDetails?.hashlock && destAtomicContract) {
                if (!lightClient.supportsNetwork(destination_network)) return

                try {
                    setVerifyingByLightClient(true)
                    const data = await lightClient.getDetails({
                        network: destination_network,
                        token: destination_token,
                        hashlock,
                        atomicContract: destAtomicContract
                    })
                    if (data) {
                        updateCommit('destinationDetailsByLightClient', { data })
                        return
                    }
                }
                catch (e) {
                    updateCommit('destinationDetailsByLightClient', { data: undefined, error: 'Light client is not available' })
                    console.log(e)
                }
                finally {
                    setVerifyingByLightClient(false)
                }
            }
        })()
    }, [destination_network, hashlock, destAtomicContract, lightClient, destination_token, sourceDetails, destination_asset])


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
        }, 2 * 60 * 1000);

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
            destinationDetails,
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
            setVerifyingByLightClient,
            updateHTLC: updateCommit,
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

const statusResolver = ({ sourceDetails, solverLockDetails, timelockExpired, secretRevealed, manualClaimRequired }: { sourceDetails: LockDetails | undefined, solverLockDetails: LockDetails | undefined, timelockExpired: boolean, secretRevealed: boolean | undefined, manualClaimRequired: boolean | undefined }) => {
    const userLocked = !!sourceDetails?.sender;
    const solverLocked = !!solverLockDetails?.sender;
    const redeemCompleted = solverLockDetails?.status === LockStatus.Redeemed;
    const refunded = sourceDetails?.status === LockStatus.Refunded;

    if (redeemCompleted) return HTLCStatus.RedeemCompleted
    else if (manualClaimRequired) return HTLCStatus.ManualClaimRequired
    else if (refunded) return HTLCStatus.Refunded
    else if (timelockExpired && !redeemCompleted) return HTLCStatus.TimelockExpired
    else if (secretRevealed || sourceDetails?.secret) return HTLCStatus.SecretRevealed
    else if (solverLocked && !sourceDetails?.secret) return HTLCStatus.SolverLockDetected
    else if (userLocked) return HTLCStatus.UserLocked
    else return HTLCStatus.Initial
}

export function useAtomicState() {
    const data = useContext<DataContextType>(AtomicStateContext as Context<DataContextType>);

    if (data === undefined) {
        throw new Error('useAtomicState must be used within a MenuStateProvider');
    }

    return data;
}

