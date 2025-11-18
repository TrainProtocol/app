import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import ButtonStatus from "./Status/ButtonStatus";
import useLockDetailsPolling from "../../../../hooks/htlc/useLockDetailsPolling";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, destAtomicContract, destinationDetails } = useAtomicState()

    // Poll for destination lock details (hashlock) using SWR
    useLockDetailsPolling({
        network: destination_network,
        commitId: commitId,
        contractAddress: destAtomicContract,
        sourceAsset: destination_asset,
        hasHashlock: !!destinationDetails?.hashlock,
        onDetailsFound: (details) => {
            updateCommit('destinationDetails', details)
        }
    })


    return <ButtonStatus
        isDisabled={true}
    >
        Locking assets
    </ButtonStatus>
}