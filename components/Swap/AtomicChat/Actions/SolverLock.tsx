import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import ButtonStatus from "./Status/ButtonStatus";
import useSolverLockPolling from "../../../../hooks/htlc/useSolverLockPolling";

export const SolverLockingAssets: FC = () => {
    const { destination_network, hashlock, updateCommit, destination_asset, destAtomicContract, solverLockDetails } = useAtomicState()

    useSolverLockPolling({
        network: destination_network,
        hashlock,
        contractAddress: destAtomicContract,
        sourceAsset: destination_asset,
        hasSolverLock: !!solverLockDetails?.sender,
        onDetailsFound: (details) => {
            updateCommit('solverLockDetails', details)
        }
    })

    return <ButtonStatus
        isDisabled={true}
        isLoading={false}
    />
}
