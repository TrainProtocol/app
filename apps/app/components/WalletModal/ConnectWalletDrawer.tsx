import { FC } from "react";
import { ChevronLeft } from "lucide-react";
import IconButton from "../buttons/iconButton";
import VaulDrawer from "../Modal/vaulModal";
import AppShellDialog from "../shared/AppShellDialog";
import ConnectorsList from "./ConnectorsList";
import { useConnectModal } from ".";

const ConnectWalletDrawer: FC = () => {
    const {
        goBack,
        onFinish,
        open,
        setOpen,
        selectedConnector,
        selectedMultiChainConnector,
        displayMode,
    } = useConnectModal();

    const title = (selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"
    const showBack = !!(selectedConnector || selectedMultiChainConnector)

    if (displayMode === 'dialog') {
        return (
            <AppShellDialog
                open={open}
                onOpenChange={(v) => { if (!v) onFinish() }}
                title={title}
                onBack={showBack ? goBack : undefined}
                contentClassName="h-[80svh]!"
            >
                <ConnectorsList onFinish={onFinish} />
            </AppShellDialog>
        )
    }

    return (
        <VaulDrawer
            show={open}
            setShow={setOpen}
            onClose={onFinish}
            modalId={"connectNewWallet"}
            header={
                <div className="flex items-center gap-1">
                    {showBack && (
                        <div className="sm:-ml-2 ml-0">
                            <IconButton onClick={goBack} icon={<ChevronLeft className="h-6 w-6" />} />
                        </div>
                    )}
                    <p>{title}</p>
                </div>
            }>
            <VaulDrawer.Snap openFullHeight id='item-1' className="h-full">
                <ConnectorsList onFinish={onFinish} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};

export default ConnectWalletDrawer;
