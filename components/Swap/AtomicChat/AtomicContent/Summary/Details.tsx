import { FC, ReactNode, SVGProps } from "react";
import WalletIcon from "../../../../Icons/WalletIcon";
import LockIcon from "../../../../Icons/LockIcon";
import SignatureIcon from "../../../../Icons/SignatureIcon";
import { useAtomicState } from "../../../../../context/atomicContext";
import shortenAddress from "../../../../utils/ShortenAddress";
import Link from "next/link";
import { CommitTransaction } from "../../../../../lib/trainApiClient";

const Details: FC = () => {
    return (
        <div className="flex flex-col space-y-4">
            <Confirmed />
            <AssetsReady />
            <SignAndConfirm />
        </div>
    )
}

const Confirmed: FC = () => {
    const { commitTxId, source_network } = useAtomicState()
    const description = (commitTxId && source_network) && <p><span>Transaction ID:</span> <Link target="_blank" className="underline hover:no-underline" href={source_network?.transactionExplorerTemplate.replace('{0}', commitTxId)}>{shortenAddress(commitTxId)}</Link></p>

    return (
        <Item
            icon={WalletIcon}
            title="Confirmed"
            description={description}
        />
    )
}

const AssetsReady: FC = () => {
    const { destination_network, commitFromApi, destinationDetails, destinationDetailsByLightClient } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)
    const description = (lpLockTx && destination_network) ? <p><span>Transaction ID:</span> <Link className="underline hover:no-underline" target="_blank" href={destination_network?.transactionExplorerTemplate.replace('{0}', lpLockTx?.hash)}>{shortenAddress(lpLockTx.hash)}</Link></p> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />

    return (
        <Item
            icon={LockIcon}
            title="Assets Ready"
            description={description}
            titleDetails={
                destinationDetailsByLightClient?.data
                    ? <div className="text-accent flex items-center gap-1">
                        <p>Light Client</p>
                        <LockIcon className="h-4 w-4 text-accent" />
                    </div>
                    : null
            }
        />
    )
}

const SignAndConfirm: FC = () => {
    const { source_network, commitFromApi } = useAtomicState()

    const addLockSigTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)
    const description = (addLockSigTx && source_network) ? <p><span>Transaction ID:</span> <Link className="underline hover:no-underline" target="_blank" href={source_network?.transactionExplorerTemplate.replace('{0}', addLockSigTx?.hash)}>{shortenAddress(addLockSigTx.hash)}</Link></p> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />

    return (
        <Item
            icon={SignatureIcon}
            title="Signed & Confirmed"
            description={description}
        />
    )
}

const Item: FC<{
    icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
    title: ReactNode;
    titleDetails?: ReactNode;
    description: ReactNode;
}> = ({ description, icon: CardIcon, title, titleDetails }) => {
    return (
        <div className="flex items-start space-x-4 w-full text-primary-text">
            <CardIcon className="w-5 sm:w-6 h-auto stroke-2" />
            <div className="w-full space-y-1">
                <div className="flex w-full justify-between">
                    <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
                    {
                        titleDetails &&
                        <div className="text-sm text-secondary-text">{titleDetails}</div>
                    }
                </div>
                <div className="text-xs sm:text-sm font-normal text-primary-text-placeholder">{description}</div>
            </div>
        </div>
    )
}

export default Details;