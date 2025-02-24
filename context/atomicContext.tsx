import { Context, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { Commit } from '../Models/PHTLC';
import { Network, Token } from '../Models/Network';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { CommitFromApi, CommitTransaction } from '../lib/layerSwapApiClient';
import LightClient from '../lib/lightClient';

export enum CommitStatus {
    Commit = 'commit',
    Commited = 'commited',
    LpLockDetected = 'lpLockDetected',
    UserLocked = 'userLocked',
    AssetsLocked = 'assetsLocked',
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
    commitId?: string,
    commitTxId?: string,
    commitStatus: CommitStatus,
    atomicQuery?: any,
    isManualClaimable?: boolean,
    onCommit: (commitId: string, txId: string) => void;
    updateCommit: (field: keyof CommitState, value: any) => void;
    setAtomicQuery: (query: any) => void
}

interface CommitState {
    sourceDetails?: Commit & { claimTime?: number };
    destinationDetails?: Commit & { fetchedByLightClient?: boolean };
    userLocked: boolean;
    error?: string | undefined;
    commitFromApi?: CommitFromApi;
    lightClient?: LightClient | undefined;
    isTimelockExpired: boolean;
    refundTxId?: string | null;
    isManualClaimable?: boolean;
    manualClaimRequested?: boolean,
}

type CommitStatesDict = Record<string, CommitState>;

export function AtomicProvider({ children }) {
    const router = useRouter()
    const { networks } = useSettingsState()

    const [atomicQuery, setAtomicQuery] = useState(router.query)

    const {
        address,
        amount,
        destination,
        destination_asset,
        source,
        source_asset,
    } = atomicQuery

    const commitId = atomicQuery?.commitId as string
    const refundTxId = atomicQuery?.refundTxId as string
    const commitTxId = atomicQuery?.txId as string

    const [commitStates, setCommitStates] = useState<CommitStatesDict>({});
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined);

    const updateCommitState = (commitId: string, newState: Partial<CommitState>) => {
        setCommitStates((prev) => ({
            ...prev,
            [commitId]: {
                ...prev[commitId],
                ...newState,
            },
        }));
    };

    const setIsTimelockExpired = (isTimelockExpired: boolean) => {
        updateCommitState(commitId, { isTimelockExpired });
    }

    const updateCommit = (field: keyof CommitState, value: any) => {
        updateCommitState(commitId, { [field]: value });
    }

    const sourceDetails = commitStates[commitId]?.sourceDetails;
    const destinationDetails = commitStates[commitId]?.destinationDetails;
    const userLocked = commitStates[commitId]?.userLocked;
    const error = commitStates[commitId]?.error;
    const commitFromApi = commitStates[commitId]?.commitFromApi;
    const isTimelockExpired = commitStates[commitId]?.isTimelockExpired;

    const source_network = networks.find(n => n.name.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.name.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const userLockTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)
    const assetsLocked = ((sourceDetails?.hashlock && destinationDetails?.hashlock) || !!userLockTransaction) ? true : false;
    const isManualClaimable = !!(assetsLocked && sourceDetails?.claimed == 3 && destinationDetails?.claimed != 3 && (sourceDetails.claimTime && (Date.now() - sourceDetails.claimTime > 30000)))

    const fetcher = (args) => fetch(args).then(res => res.json())
    const url = process.env.NEXT_PUBLIC_TRAIN_API
    const { data } = useSWR<ApiResponse<CommitFromApi>>((commitId && commitFromApi?.transactions.length !== 3) ? `${url}/api/swaps/${commitId}` : null, fetcher, { refreshInterval: 5000 })

    const commitStatus = useMemo(() => statusResolver({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired: isTimelockExpired, userLocked }), [commitFromApi, sourceDetails, destinationDetails, destination_network, isTimelockExpired, userLocked, refundTxId])

    useEffect(() => {
        if (data?.data) {
            updateCommit('commitFromApi', data.data)
        }
    }, [data])

    useEffect(() => {
        if (destination_network && commitStatus !== CommitStatus.TimelockExpired && commitStatus !== CommitStatus.RedeemCompleted) {
            (async () => {
                try {
                    const lightClient = new LightClient()
                    await lightClient.initProvider({ network: destination_network })
                    setLightClient(lightClient)
                } catch (error) {
                    console.log(error.message)
                    console.log(error)
                }

            })()
        }
    }, [destination_network])


    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (!sourceDetails?.timelock || isTimelockExpired || (sourceDetails.hashlock && !destinationDetails?.hashlock)) return
        const time = (Number(sourceDetails?.timelock + 5) * 1000) - Date.now()


        if (!sourceDetails.hashlock || (destinationDetails && destinationDetails.claimed == 1)) {
            if (time < 0) {
                setIsTimelockExpired(true)
                return
            }
            timer = setInterval(() => {
                if (!isTimelockExpired) {
                    setIsTimelockExpired(true)
                    clearInterval(timer)
                }
            }, time);

        }

        return () => timer && clearInterval(timer)

    }, [sourceDetails, destinationDetails])

    const handleCommited = (commitId: string, txId: string) => {
        setAtomicQuery({ ...atomicQuery, commitId, txId })
        const basePath = router?.basePath || ""
        var atomicURL = window.location.protocol + "//"
            + window.location.host + `${basePath}/atomic`;
        const atomicParams = new URLSearchParams({ ...atomicQuery, commitId, txId })
        if (atomicParams) {
            atomicURL += `?${atomicParams}`
        }
        window.history.pushState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);
        updateCommitState(commitId, {});
    }

    return (
        <AtomicStateContext.Provider value={{
            atomicQuery,
            source_network,
            onCommit: handleCommited,
            source_asset: source_token,
            destination_asset: destination_token,
            address: address as string,
            amount: amount ? Number(amount) : undefined,
            destination_network,
            commitId: commitId as string,
            commitTxId: commitTxId as string,
            sourceDetails,
            destinationDetails,
            userLocked,
            error,
            commitFromApi,
            lightClient,
            commitStatus,
            isTimelockExpired,
            refundTxId,
            isManualClaimable,
            updateCommit,
            setAtomicQuery
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

const statusResolver = ({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired, userLocked }: { commitFromApi: CommitFromApi | undefined, sourceDetails: Commit | undefined, destinationDetails: Commit | undefined, destination_network: Network | undefined, timelockExpired: boolean, userLocked: boolean }) => {
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const userLockTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;
    const assetsLocked = ((sourceDetails?.hashlock && destinationDetails?.hashlock) || !!userLockTransaction) ? true : false;
    const redeemCompleted = (destinationDetails?.claimed == 3 ? true : false) || lpRedeemTransaction?.hash;

    if (redeemCompleted) return CommitStatus.RedeemCompleted
    else if (timelockExpired) return CommitStatus.TimelockExpired
    else if (assetsLocked) return CommitStatus.AssetsLocked
    else if (userLocked) return CommitStatus.UserLocked
    else if (lpLockDetected) return CommitStatus.LpLockDetected
    else if (commited) return CommitStatus.Commited
    else return CommitStatus.Commit
}

export function useAtomicState() {
    const data = useContext<DataContextType>(AtomicStateContext as Context<DataContextType>);

    if (data === undefined) {
        throw new Error('useAtomicState must be used within a MenuStateProvider');
    }

    return data;
}