import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import ButtonStatus from "./Status/ButtonStatus";
import useSolverLockPolling from "../../../../hooks/htlc/useSolverLockPolling";

export const SolverLockingAssets: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, destAtomicContract, solverLockDetails } = useAtomicState()

    useSolverLockPolling({
        network: destination_network,
        commitId: commitId,
        contractAddress: destAtomicContract,
        sourceAsset: destination_asset,
        hasSolverLock: !!solverLockDetails?.sender,
        onDetailsFound: (details) => {
            updateCommit('solverLockDetails', details)
        }
    })

    return <ButtonStatus
        isDisabled={true}
        isLoading={true}
    >
        Waiting for solver
    </ButtonStatus>
}
