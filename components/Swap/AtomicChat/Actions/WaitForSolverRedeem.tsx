import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import ButtonStatus from "./Status/ButtonStatus";
import useSolverRedeemPolling from "../../../../hooks/htlc/useSolverRedeemPolling";

export const WaitForSolverRedeem: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, destAtomicContract } = useAtomicState()

    useSolverRedeemPolling({
        network: destination_network,
        commitId: commitId,
        contractAddress: destAtomicContract,
        asset: destination_asset,
        onStatusUpdate: (details) => {
            updateCommit('solverLockDetails', details)
        }
    })

    return <ButtonStatus
        isDisabled={true}
        isLoading={true}
    >
        Waiting for solver to claim
    </ButtonStatus>
}
