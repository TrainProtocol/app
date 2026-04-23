import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import IconButton from "../buttons/iconButton";
import VaulDrawer from "../Modal/vaulModal";
import ConnectorsList from "./ConnectorsList";
import { useConnectModal } from ".";
import useWindowDimensions from "@/hooks/useWindowDimensions";

const ConnectWalletDrawer: FC = () => {
    const { isMobile: isMobileSize } = useWindowDimensions();
    const {
        goBack,
        onFinish,
        open,
        setOpen,
        selectedConnector,
        selectedMultiChainConnector,
        renderMode,
    } = useConnectModal();

    if (renderMode !== 'drawer') return null;

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
            <VaulDrawer.Snap openFullHeight={!isMobileSize} id='item-1' className="pb-4 sm:pb-0! sm:h-full">
                <ConnectorsList onFinish={onFinish} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};

export default ConnectWalletDrawer;
