import { Context, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router';
import { useSettingsState } from './settings';
import { Commit, LockStatus } from '../Models/phtlc/PHTLC';
import { Network, Token } from '../Models/Network';
import useSWR from 'swr';
import { ApiResponse } from '../Models/ApiResponse';
import { CommitFromApi, CommitTransaction } from '../lib/trainApiClient';
import LightClient from '../lib/lightClient';

export enum CommitStatus {
    Commit = 'commit',
    Commited = 'commited',
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
    commitId?: string,
    commitTxId?: string,
    commitStatus: CommitStatus,
    atomicQuery?: any,
    destRedeemTx?: string,
    verifyingByLightClient: boolean,
    srcAtomicContract?: string,
    destAtomicContract?: string,
    setVerifyingByLightClient: (value: boolean) => void;
    onCommit: (commitId: string, txId: string, nonce?: number) => void;
    updateCommit: (field: keyof CommitState, value: any) => void;
    setAtomicQuery: (query: any) => void;
}

interface CommitState {
    sourceDetails?: Commit;
    destinationDetails?: Commit;
    solverLockDetails?: Commit;
    destinationDetailsByLightClient?: { data?: Commit, error?: string };
    nonce?: number;
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
    const solverName = atomicQuery?.solver as string;
    const srcAtomicContractFromQuery = atomicQuery?.srcContract as string
    const destAtomicContractfromQuery = atomicQuery?.destContract as string

    const [commitStates, setCommitStates] = useState<CommitStatesDict>({});
    const [lightClient, setLightClient] = useState<LightClient | undefined>(undefined);
    const [verifyingByLightClient, setVerifyingByLightClient] = useState(false)

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
    const solverLockDetails = commitStates[commitId]?.solverLockDetails;
    const nonce = commitStates[commitId]?.nonce;
    const secretRevealed = commitStates[commitId]?.secretRevealed;
    const error = commitStates[commitId]?.error;
    const commitFromApi = commitStates[commitId]?.commitFromApi;
    const isTimelockExpired = commitStates[commitId]?.isTimelockExpired;
    const destinationDetailsByLightClient = commitStates[commitId]?.destinationDetailsByLightClient

    const destinationRedeemTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination)?.hash

    const source_network = networks.find(n => n.slug.toUpperCase() === (source as string)?.toUpperCase())
    const destination_network = networks.find(n => n.slug.toUpperCase() === (destination as string)?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const destAtomicContract = commitFromApi?.destinationContractAddress || destAtomicContractfromQuery
    const srcAtomicContract = commitFromApi?.sourceContractAddress || srcAtomicContractFromQuery

    const fetcher = (args: string) => fetch(args).then(res => res.json())
    const url = process.env.NEXT_PUBLIC_TRAIN_API
    const { data } = useSWR<ApiResponse<CommitFromApi>>((commitId && !destinationRedeemTx) ? `${url}/api/${solverName}/swaps/${commitId}` : null, fetcher, { refreshInterval: 2000 })
    const commitStatus = useMemo(() => statusResolver({ sourceDetails, solverLockDetails, timelockExpired: isTimelockExpired, secretRevealed }), [sourceDetails, solverLockDetails, isTimelockExpired, secretRevealed, refundTxId])

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
                    console.log(error)
                }

            })()
        }
    }, [destination_network])

    useEffect(() => {
        (async () => {
            if (destination_network && destination_token && commitId && destination_asset && lightClient && !sourceDetails?.hashlock && destAtomicContract) {
                if(!lightClient.supportsNetwork(destination_network)) return

                try {
                    setVerifyingByLightClient(true)
                    const data = await lightClient.getHashlock({
                        network: destination_network,
                        token: destination_token,
                        commitId,
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
    }, [destination_network, commitId, destAtomicContract, lightClient, destination_token, sourceDetails, destination_asset])


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

    const handleCommited = (commitId: string, txId: string, nonce?: number) => {
        const queryUpdate = { ...atomicQuery, commitId, txId, ...(nonce ? { nonce: String(nonce) } : {}) }
        setAtomicQuery(queryUpdate)
        const basePath = router?.basePath || ""
        var atomicURL = window.location.protocol + "//"
            + window.location.host + `${basePath}/swap`;
        const atomicParams = new URLSearchParams(queryUpdate)
        if (atomicParams) {
            atomicURL += `?${atomicParams}`
        }
        window.history.replaceState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);
        updateCommitState(commitId, { nonce });
    }

    // Restore nonce from URL query if not in state
    useEffect(() => {
        const nonceFromQuery = atomicQuery?.nonce
        if (nonceFromQuery && commitId && !nonce) {
            updateCommit('nonce', Number(nonceFromQuery))
        }
    }, [atomicQuery?.nonce, commitId, nonce])

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
            solver: solverName,
            sourceDetails,
            destinationDetails,
            solverLockDetails,
            nonce,
            secretRevealed,
            error,
            commitFromApi,
            lightClient,
            commitStatus,
            isTimelockExpired,
            refundTxId,
            destRedeemTx: destinationRedeemTx,
            verifyingByLightClient,
            destinationDetailsByLightClient,
            srcAtomicContract: '0xa41a70ebd490dcc00567f447715138023c5c7428',
            destAtomicContract,
            setVerifyingByLightClient,
            updateCommit,
            setAtomicQuery
        }}>
            {children}
        </AtomicStateContext.Provider>
    )
}

const statusResolver = ({ sourceDetails, solverLockDetails, timelockExpired, secretRevealed }: { sourceDetails: Commit | undefined, solverLockDetails: Commit | undefined, timelockExpired: boolean, secretRevealed: boolean | undefined }) => {
    const commited = !!sourceDetails?.sender;
    const solverLocked = !!solverLockDetails?.sender;
    const redeemCompleted = solverLockDetails?.status === LockStatus.Redeemed;
    const isTimelockActuallyExpired = timelockExpired ||
        (sourceDetails?.timelock ? (sourceDetails.timelock * 1000) < Date.now() : false);

    if (redeemCompleted) return CommitStatus.RedeemCompleted
    else if (isTimelockActuallyExpired && !redeemCompleted) return CommitStatus.TimelockExpired
    else if (secretRevealed) return CommitStatus.SecretRevealed
    else if (solverLocked) return CommitStatus.SolverLockDetected
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