import { Context, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { LockDetails, LockStatus } from '../Models/phtlc/PHTLC';
import { Network, Token } from '../Models/Network';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { CommitFromApi, CommitTransaction } from '../lib/trainApiClient';
import LightClient from '../lib/lightClient';
import { useSwapStore } from '../stores/swapStore';
import { useShallow } from 'zustand/react/shallow';
import { resolvePersistantQueryParams } from '../helpers/querryHelper';
import useUserLockPolling from '../hooks/htlc/useUserLockPolling';
import useSolverLockPolling from '../hooks/htlc/useSolverLockPolling';
import useWallet from '@/hooks/useWallet';

export enum HTLCStatus {
    Initial = 'initial',
    UserLocked = 'userLocked',
    SolverLockDetected = 'solverLockDetected',
    SecretRevealed = 'secretRevealed',
    RedeemCompleted = 'redeemCompleted',
    TimelockExpired = 'timelockExpired',
    Refunded = 'refunded',
}

const AtomicStateContext = createContext<DataContextType | null>(null);

type DataContextType = CommitState & {
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
    setVerifyingByLightClient: (value: boolean) => void;
    onCommit: (hashlock: string, txId: string) => void;
    updateCommit: (field: keyof CommitState, value: any) => void;
}

interface CommitState {
    sourceDetails?: LockDetails;
    destinationDetails?: LockDetails;
    solverLockDetails?: LockDetails;
    destinationDetailsByLightClient?: { data?: LockDetails, error?: string };
    secretRevealed?: boolean;
    error?: { message: string, buttonText?: string } | undefined;
    commitFromApi?: CommitFromApi;
    lightClient?: LightClient | undefined;
    isTimelockExpired: boolean;
    refundTxId?: string | null;
    solver: string,
}

type CommitStatesDict = Record<string, CommitState>;

export function AtomicProvider({ children }) {
    const router = useRouter()
    const { networks } = useSettingsState()

    const [activeHashlock, setActiveHashlock] = useState<string | undefined>(
        router.query.hashlock as string | undefined
    )

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
    const srcAtomicContractFromStore = currentSwap?.srcContract
    const destAtomicContractFromStore = currentSwap?.destContract

    const [htlcStates, setHtlcStates] = useState<CommitStatesDict>({});
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined);
    const [verifyingByLightClient, setVerifyingByLightClient] = useState(false)

    const updateCommitState = (hashlock: string, newState: Partial<CommitState>) => {
        setHtlcStates((prev) => ({
            ...prev,
            [hashlock]: {
                ...prev[hashlock],
                ...newState,
            },
        }));
    };

    const setIsTimelockExpired = (isTimelockExpired: boolean) => {
        if (hashlock) updateCommitState(hashlock, { isTimelockExpired });
    }

    const updateCommit = (field: keyof CommitState, value: any) => {
        if (hashlock) updateCommitState(hashlock, { [field]: value });
    }

    const sourceDetails = hashlock ? htlcStates[hashlock]?.sourceDetails : undefined;
    const destinationDetails = hashlock ? htlcStates[hashlock]?.destinationDetails : undefined;
    const solverLockDetails = hashlock ? htlcStates[hashlock]?.solverLockDetails : undefined;
    const secretRevealed = hashlock ? htlcStates[hashlock]?.secretRevealed : undefined;
    const error = hashlock ? htlcStates[hashlock]?.error : undefined;
    const commitFromApi = hashlock ? htlcStates[hashlock]?.commitFromApi : undefined;
    const isTimelockExpired = hashlock ? htlcStates[hashlock]?.isTimelockExpired : false;
    const destinationDetailsByLightClient = hashlock ? htlcStates[hashlock]?.destinationDetailsByLightClient : undefined

    const destinationRedeemTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination)?.hash

    const source_network = networks.find(n => n.slug.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.slug.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const destAtomicContract = '0xcf6d47cdd0cb259e78262832b4db3f4f4f909dcb' // commitFromApi?.destinationContractAddress || destAtomicContractfromQuery
    const srcAtomicContract = '0x9A0E4E619d391f6352E112cC4c452344a3EB4119' //commitFromApi?.sourceContractAddress || srcAtomicContractFromQuery

    const fetcher = (args: string) => fetch(args).then(res => res.json())
    const url = process.env.NEXT_PUBLIC_TRAIN_API
    const { data } = useSWR<ApiResponse<CommitFromApi>>((hashlock && !destinationRedeemTx) ? `${url}/api/${solverName}/swaps/${hashlock}` : null, fetcher, { refreshInterval: 2000 })
    const htlcStatus = useMemo(() =>
        statusResolver({
            sourceDetails, solverLockDetails, timelockExpired: isTimelockExpired, secretRevealed
        }), [sourceDetails, solverLockDetails, isTimelockExpired, secretRevealed])

    const isTerminal = htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded
    const { provider } = useWallet(source_network, 'autofill')

    const { details: userLockPollData } = useUserLockPolling({
        network: source_network,
        hashlock,
        contractAddress: srcAtomicContract,
        sourceAsset: source_token,
        enabled: !!hashlock && !isTerminal,
        provider
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
            updateCommitState(hashlock, { sourceDetails: userLockPollData })
        }
    }, [userLockPollData, hashlock])

    useEffect(() => {
        if (solverLockPollData && hashlock) {
            updateCommitState(hashlock, { solverLockDetails: solverLockPollData })
        }
    }, [solverLockPollData, hashlock])

    useEffect(() => {
        if (data?.data) {
            updateCommit('commitFromApi', data.data)
        }
    }, [data])

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

    const handleCommited = (hashlock: string, txId: string) => {
        // Move tempSwap → swaps[hashlock] in the store
        commitSwap(hashlock, txId)
        setActiveHashlock(hashlock)

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
            onCommit: handleCommited,
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
            commitFromApi,
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
            updateCommit,
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

const statusResolver = ({ sourceDetails, solverLockDetails, timelockExpired, secretRevealed }: { sourceDetails: LockDetails | undefined, solverLockDetails: LockDetails | undefined, timelockExpired: boolean, secretRevealed: boolean | undefined }) => {
    const userLocked = !!sourceDetails?.sender;
    const solverLocked = !!solverLockDetails?.sender;
    const redeemCompleted = solverLockDetails?.status === LockStatus.Redeemed;
    const isTimelockActuallyExpired = timelockExpired ||
        (sourceDetails?.timelock ? (sourceDetails.timelock * 1000) < Date.now() : false);

    const refunded = sourceDetails?.status === LockStatus.Refunded;

    if (redeemCompleted) return HTLCStatus.RedeemCompleted
    else if (refunded) return HTLCStatus.Refunded
    else if (isTimelockActuallyExpired && !redeemCompleted) return HTLCStatus.TimelockExpired
    else if (secretRevealed) return HTLCStatus.SecretRevealed
    else if (solverLocked) return HTLCStatus.SolverLockDetected
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
