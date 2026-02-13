import { FC, ReactNode, SVGProps } from "react";
import Link from "next/link";
import shortenString from "@/components/utils/ShortenString";
import { getExplorerUrl } from "@/lib/address";
import { useAtomicState } from "@/context/atomicContext";
import WalletIcon from "@/components/Icons/WalletIcon";
import LockIcon from "@/components/Icons/LockIcon";
import SignatureIcon from "@/components/Icons/SignatureIcon";
import { CommitTransaction } from "@/lib/trainApiClient";
import NetworkSettings from "@/lib/NetworkSettings";

const Details: FC = () => {
    return (
        <div className="flex flex-col space-y-4">
            <Confirmed />
            <AssetsReady />
        </div>
    )
}

const Confirmed: FC = () => {
    const { lockTxId, source_network } = useAtomicState()
    const description = (lockTxId && source_network) && <p><span>Transaction ID:</span> <Link target="_blank" className="underline hover:no-underline" href={getExplorerUrl(NetworkSettings.KnownSettings[source_network.slug]?.TransactionExplorerTemplate, lockTxId)}>{shortenString(lockTxId)}</Link></p>

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
    const description = (lpLockTx && destination_network) ? <p><span>Transaction ID:</span> <Link className="underline hover:no-underline" target="_blank" href={getExplorerUrl(NetworkSettings.KnownSettings[destination_network.slug]?.TransactionExplorerTemplate, lpLockTx?.hash)}>{shortenString(lpLockTx.hash)}</Link></p> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />

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
                <div className="text-xs sm:text-sm font-normal text-primary-text-tertiary">{description}</div>
            </div>
        </div>
    )
}

export default Details;