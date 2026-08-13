import { FC, useMemo, useState } from "react";
import { AccountIdentity, useSelectSwapAccount, useSwapAccounts } from "@/context/swapAccounts";
import { SwapDirection, SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { WalletsIcons } from "@/components/Wallet/ConnectedWallets";
import { ChevronDown } from "lucide-react";
import { WalletIcon } from "@layerswap/ui-kit/components";
import { Address } from "@/lib/address";
import ConnectButton from "@/components/buttons/connectButton";
import VaulDrawer from "@/components/Modal/vaulModal";
import { WalletItem } from "@/components/Wallet/WalletsList";
import { ConnectNewWalletButton } from "@/components/Wallet/ConnectNewWalletButton";
import type { Wallet } from "@layerswap/widget-types";
import { SelectAccountProps } from "@layerswap/wallet-core/types";
import { Network } from "@/Models/Network";
import { useFormikContext } from "formik";
import { useConnectModal } from "@/components/WalletModal";
import WalletIconView from "@/components/Wallet/WalletIconView";

const PickerWalletConnect: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const [openModal, setOpenModal] = useState(false);
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const swapAccounts = useSwapAccounts(direction);
    const selectSwapAccount = useSelectSwapAccount(direction);
    const { connect } = useConnectModal();

    const connectWallet = async () => {
        const result = await connect();
        if (result) {
            handleSelectAccount({
                walletId: result.id,
                address: result.address,
                providerName: result.providerName,
            });
        }
    };

    const handleSelectAccount = (props: SelectAccountProps) => {
        const { walletId, address, providerName } = props;
        if (direction == 'to' && Address.isValid(address, values.to))
            setFieldValue(`destination_address`, address);
        selectSwapAccount({ id: walletId, address, providerName });
        setOpenModal(false);
    };

    return (
        <>
            <AccountsPickerButton accounts={swapAccounts} onOpenModalClick={() => setOpenModal(true)} />
            <VaulDrawer
                show={openModal}
                setShow={setOpenModal}
                header="Select wallet"
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1" className="space-y-1 pb-4">
                    <ConnectNewWalletButton onClick={connectWallet} />
                    {swapAccounts.map((account, index) => (
                        <div key={index}>
                            <div className="flex justify-between items-center px-4 pt-2">
                                <label className="block font-medium text-secondary-text text-sm pl-1 py-1">
                                    {account.provider.name}
                                </label>
                            </div>
                            <AccountsList
                                selectedAccount={account}
                                onSelect={handleSelectAccount}
                                network={direction === 'from' ? values.from : values.to}
                            />
                        </div>
                    ))}
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    );
};

const AccountsPickerButton: FC<{ accounts: (Wallet | AccountIdentity)[], onOpenModalClick: () => void }> = ({ accounts, onOpenModalClick }) => {
    const firstWallet = useMemo(() => accounts[0], [accounts]);

    if (accounts.length > 0) {
        return (
            <button
                type="button"
                onClick={onOpenModalClick}
                className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down"
            >
                {accounts.length === 1 ? (
                    <div className="flex gap-2 items-center text-sm text-secondary-text">
                        <WalletIconView wallet={firstWallet} className="h-5 w-5" />
                        {firstWallet.address && (
                            <p>{new Address(firstWallet.address, null, firstWallet.providerName).toShortString()}</p>
                        )}
                        <ChevronDown className="h-5 w-5" />
                    </div>
                ) : (
                    <WalletsIcons wallets={accounts} />
                )}
            </button>
        );
    }

    return (
        <ConnectButton>
            <div className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down">
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    );
};

type AccountsListProps = {
    selectedAccount: AccountIdentity;
    onSelect: (props: SelectAccountProps) => void;
    network?: Network;
};

const AccountsList: FC<AccountsListProps> = ({ selectedAccount, onSelect, network }) => {
    const provider = selectedAccount.provider;
    const connectedWallets: (Wallet | AccountIdentity)[] = provider.connectedWallets || [];

    const isAccountDuplicate = connectedWallets.some(
        w => w.addresses.some(a => Address.equals(a, selectedAccount.address, network ?? null))
    );

    const accounts: (Wallet | AccountIdentity)[] = [
        ...connectedWallets,
        ...(!isAccountDuplicate ? [selectedAccount] : []),
    ];

    return (
        <div className="space-y-3">
            {accounts.length > 0 &&
                <div className="flex flex-col justify-start gap-2 rounded-xl">
                    {accounts.map((wallet, index) => (
                        <WalletItem
                            key={`${index}${wallet.providerName}`}
                            account={wallet}
                            selectable={true}
                            onWalletSelect={onSelect}
                            selectedAddress={selectedAccount.address}
                        />
                    ))}
                </div>
            }
        </div>
    );
};

export default PickerWalletConnect;
