import { ensureRegistryBrowseLoaded, useWalletDescriptorLoader } from "@layerswap/wallet-core";
import { type FC, useCallback, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { ConnectorsList as UiKitConnectorsList } from "@layerswap/ui-kit/components";
import type { ConnectorsListProps } from "@layerswap/ui-kit/components";
import IconButton from "../buttons/iconButton";
import VaulDrawer from "../Modal/vaulModal";
import AppShellDialog from "../shared/AppShellDialog";
import TrainLogoSymbol from "@/components/Icons/TrainLogoSymbol";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import useWallet from "@/hooks/useWallet";
import { useAztecWalletContext } from "../WalletProviders/AztecWalletProvider";
import AztecEmojiVerification from "./AztecEmojiVerification";
import { useConnectModal } from ".";

const ConnectorsList = UiKitConnectorsList as FC<ConnectorsListProps>;

const ConnectWalletDrawer: FC = () => {
    const {
        goBack,
        onFinish,
        open,
        setOpen,
        selectedConnector,
        selectedMultiChainConnector,
        setSelectedConnector,
        displayMode,
    } = useConnectModal();
    const { pendingVerification } = useAztecWalletContext();
    const { providers } = useWallet();
    const { isMobile } = useWindowDimensions();
    const { loadAll } = useWalletDescriptorLoader();

    useEffect(() => {
        if (!open) return;
        ensureRegistryBrowseLoaded();
        void loadAll().then(() => ensureRegistryBrowseLoaded());
    }, [open, loadAll]);

    const title = selectedMultiChainConnector && !selectedConnector ? "Select ecosystem" : "Connect wallet";
    const showBack = !!(selectedConnector || selectedMultiChainConnector);
    const cancelPendingVerification = useCallback(() => {
        pendingVerification?.cancel();
        setSelectedConnector(undefined);
    }, [pendingVerification, setSelectedConnector]);
    const handleBack = pendingVerification ? cancelPendingVerification : goBack;
    const handleClose = useCallback(() => {
        pendingVerification?.cancel();
        onFinish();
    }, [onFinish, pendingVerification]);
    const content = pendingVerification ? (
        <AztecEmojiVerification
            emojis={pendingVerification.emojis}
            onConfirm={() => { void pendingVerification.confirm(); }}
            onCancel={cancelPendingVerification}
        />
    ) : (
        <ConnectorsList
            providers={providers}
            onFinish={onFinish}
            brandMark={<TrainLogoSymbol className="w-11 h-auto" />}
        />
    );

    if (displayMode === "dialog" && !isMobile) {
        return (
            <AppShellDialog
                open={open}
                onOpenChange={value => { if (!value) handleClose(); }}
                title={title}
                onBack={showBack ? handleBack : undefined}
                contentClassName="h-[550px]! max-h-[85svh]!"
            >
                {content}
            </AppShellDialog>
        )
    }

    return (
        <VaulDrawer
            show={open}
            setShow={setOpen}
            onClose={handleClose}
            modalId="connectNewWallet"
            header={
                <div className="flex items-center gap-1">
                    {showBack && (
                        <div className="sm:-ml-2 ml-0">
                            <IconButton onClick={handleBack} icon={<ChevronLeft className="h-6 w-6" />} />
                        </div>
                    )}
                    <p>{title}</p>
                </div>
            }>
            <VaulDrawer.Snap openFullHeight id="item-1" className="h-full">
                {content}
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};

export default ConnectWalletDrawer;
