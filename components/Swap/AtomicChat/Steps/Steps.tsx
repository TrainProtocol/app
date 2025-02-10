import { FC, SVGProps, useMemo } from "react"
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext"
import { CommitTransaction } from "../../../../lib/layerSwapApiClient"
import AtomicCard from "./AtomicCard"
import WalletIcon from "../../../Icons/WalletIcon"
import CheckedIcon from "../../../Icons/CheckedIcon"
import ConnectedWallet from "../ConnectedWallet"
import SignatureIcon from "../../../Icons/SignatureIcon"
import Link from "next/link"
import shortenAddress from "../../../utils/ShortenAddress"
import LockIcon from "../../../Icons/LockIcon"
import LoaderIcon from "../../../Icons/LoaderIcon"

const WrappedLoaderIcon = (props: SVGProps<SVGSVGElement>) => <LoaderIcon {...props} className={`${props.className} animate-reverse-spin`} />
const WrappedCheckedIcon = (props: SVGProps<SVGSVGElement>) => <CheckedIcon {...props} className={`${props.className} text-accent`} />

export const RequestStep: FC = () => {
    const { sourceDetails, commitId, commitFromApi } = useAtomicState()
    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)

    const commtting = (commitId && !sourceDetails) ? true : false;
    const commited = (sourceDetails || lpLockTx) ? true : false;

    const resolvedIcon = (() => {
        if (commtting) {
            return WrappedLoaderIcon
        }
        if (commited) {
            return WrappedCheckedIcon
        }
        return WalletIcon
    })()

    const resolvedTitle = (() => {
        if (commited) {
            return "Confirmed"
        }
        return "Confirm in wallet"
    })()

    const description = <div>
        <p>
            Initiates a swap process with the solver
        </p>
        <div className="flex items-center gap-2">
            <p>
                Sending from
            </p>
            <ConnectedWallet
                disabled={commtting || commited}
            />
        </div>
    </div>

    return <AtomicCard
        icon={resolvedIcon}
        title={resolvedTitle}
        description={description}
    // titleDetails='($0.02)'
    />

}

export const LpLockStep: FC = () => {
    const { destinationDetails, commitStatus, commitFromApi, destination_network } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const completed = !!destinationDetails?.hashlock || !!lpRedeemTransaction?.hash || commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked

    const resolvedParams = (() => {
        if (completed) {
            return {
                title: "Assets ready",
                description: <div>
                    <p>
                        The assets are ready to be transferred to your address
                    </p>
                    <div className="inline-flex gap-1 items-center">
                        <p>Transaction ID:</p> {(lpLockTx && destination_network) ? <Link className="underline hover:no-underline" target="_blank" href={destination_network?.transaction_explorer_template.replace('{0}', lpLockTx?.hash)}>{shortenAddress(lpLockTx.hash)}</Link> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />}
                    </div>
                </div>,
                titleDetails: destinationDetails?.fetchedByLightClient && <div className="text-xs font-medium text-accent flex items-center gap-1">
                    <p>Light Client</p>
                    <LockIcon className="h-4 w-4 text-accent" />
                </div>,
                icon: WrappedCheckedIcon
            }
        }
        return {
            title: "Preparing the assets",
            description: "Reserving the assets to be sent to your destination address.",
            icon: WrappedLoaderIcon
        }
    })()

    return <AtomicCard
        {...resolvedParams}
    />
}

export const SignAndConfirmStep: FC = () => {
    const { destinationDetails, commitStatus, commitFromApi, source_network, destination_network, sourceDetails } = useAtomicState()
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const completed = !!(sourceDetails?.hashlock && destinationDetails?.hashlock) || !!lpRedeemTransaction?.hash || commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked
    const addLockSigTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)

    const resolvedIcon = (() => {
        if (commitStatus === CommitStatus.UserLocked) {
            return WrappedLoaderIcon
        }
        if (completed) {
            return WrappedCheckedIcon
        }
        return SignatureIcon
    })()

    const resolvedParams = (() => {
        if (completed) {
            return {
                title: 'Signed & Confirmed',
                description: <div className="inline-flex gap-1 items-center">
                    <p>Transaction ID:</p> {(addLockSigTx && source_network) ? <Link className="underline hover:no-underline" target="_blank" href={source_network?.transaction_explorer_template.replace('{0}', addLockSigTx?.hash)}>{shortenAddress(addLockSigTx.hash)}</Link> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />}
                </div>
            }
        }
        return {
            title: 'Sign & confirm in wallet',
            description: 'Sign in wallet to complete the transaction',
        }
    })()

    return <AtomicCard
        {...resolvedParams}
        icon={resolvedIcon}
    />
}

export const ClaimStep: FC = () => {
    const { commitStatus, commitFromApi, destination_network } = useAtomicState()
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)

    const resolvedParams = useMemo(() => (() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return {
                title: 'Assets Received',
                description: <div className="inline-flex gap-1 items-center">
                    <p>Transaction ID:</p> {(lpRedeemTransaction && destination_network) ? <Link className="underline hover:no-underline" target="_blank" href={destination_network?.transaction_explorer_template.replace('{0}', lpRedeemTransaction?.hash)}>{shortenAddress(lpRedeemTransaction.hash)}</Link> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />}
                </div>,
                icon: WrappedCheckedIcon
            }
        }
        return {
            title: 'Sending your assets',
            description: 'You will receive your assets at the destination address shortly.',
            icon: WrappedLoaderIcon
        }
    })(), [commitStatus, lpRedeemTransaction, destination_network])

    return <AtomicCard
        {...resolvedParams}
    />
}
