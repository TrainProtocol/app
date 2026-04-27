import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import IconButton from "../buttons/iconButton";
import VaulDrawer from "../Modal/vaulModal";
import ConnectorsList from "./ConnectorsList";
import { useConnectModal } from ".";
import { useAppDialogueStore } from "@/stores/appDialogueStore";

const ConnectWalletDrawer: FC = () => {
    const {
        goBack,
        onFinish,
        open,
        setOpen,
        selectedConnector,
        selectedMultiChainConnector,
    } = useConnectModal();
    const hostedInDialogue = useAppDialogueStore((s) => s.view === 'connectWallet');

    if (hostedInDialogue) return null;

    return (
        <VaulDrawer
            show={open}
            setShow={setOpen}
            onClose={onFinish}
            modalId={"connectNewWallet"}
            header={
                <div className="flex items-center gap-1">
                    {(selectedConnector || selectedMultiChainConnector) && (
                        <div className="sm:-ml-2 ml-0">
                            <IconButton onClick={goBack} icon={<ChevronLeft className="h-6 w-6" />} />
                        </div>
                    )}
                    <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>
                </div>
            }>
            <VaulDrawer.Snap openFullHeight id='item-1' className="h-full">
                <ConnectorsList onFinish={onFinish} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};

export default ConnectWalletDrawer;
