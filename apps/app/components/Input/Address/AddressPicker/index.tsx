import { useFormikContext } from "formik";
import { FC, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Partner } from "@/Models/Partner";
import useWallet from "@/hooks/useWallet";
import { Address as AddressClass } from "@/lib/address";
import ManualAddressInput from "./ManualAddressInput";
import VaulDrawer from "@/components/Modal/vaulModal";
import { Network } from "@/Models/Network";
import AddressBook from "./AddressBook";
import AddressButton from "./AddressButton";
import { useQueryState } from "@/context/query";
import ConnectedWallets from "./ConnectedWallets";
import { Wallet } from "@/Models/WalletProvider";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import ConnectWalletButton from "./ConnectedWallets/ConnectWalletButton";
import { useAddressesStore } from "@/stores/addressesStore";
import { captureEvent } from "@/lib/faro";

export enum AddressGroup {
    ConnectedWallet = "Connected wallet",
    ManualAdded = "Added Manually",
    RecentlyUsed = "Recently used",
    FromQuery = "Partner",
}

export type AddressItem = {
    address: string,
    group: AddressGroup,
    date?: string,
    wallet?: Wallet,
}

export type AddressTriggerProps = {
    addressItem?: AddressItem;
    connectedWallet?: Wallet;
    partner?: Partner;
    destination: Network | undefined,
}

interface Input {
    children: (props: AddressTriggerProps) => JSX.Element;
    showAddressModal: boolean;
    setShowAddressModal: (show: boolean) => void;
    hideLabel?: boolean;
    name: string;
    close: () => void,
    partner?: Partner,
    canFocus?: boolean,
}

const AddressPicker: FC<Input> = forwardRef<HTMLInputElement, Input>(function Address
    ({ showAddressModal, setShowAddressModal, name, canFocus, close, partner, children }, ref) {

    const {
        values,
        setFieldValue
    } = useFormikContext<SwapFormValues>();

    const query = useQueryState()
    const { destination_address, to: destination } = values
    const selectDestinationAccount = useSelectSwapAccount("to");

    const storedAddresses = useAddressesStore(s => s.addresses)
    const addAddress = useAddressesStore(s => s.addAddress)
    const { provider, unAvailableWallets } = useWallet(destination, 'autofill')
    const connectedWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || []
    const defaultAccount = useSelectedAccount("to", values.to?.caip2Id);
    const connectedWalletskey = connectedWallets?.map(w => w.addresses.join('')).join('')
    const [manualAddress, setManualAddress] = useState<string>('')

    // Get manually added address from context (shared across all AddressPicker instances)
    const manualAddressFromContext = defaultAccount?.id === 'manually_added' ? defaultAccount.address : undefined

    useEffect(() => {
        if (destination_address && destination && !AddressClass.isValid(destination_address, destination)) {
            updateDestAddress('');
            setManualAddress('');
        }
    }, [destination, destination_address])

    const inputReference = useRef<HTMLInputElement>(null);

    const groupedAddresses = useMemo(() => {
        return resolveAddressGroups({
            destination,
            wallets: connectedWallets,
            manualAddressFromContext,
            addressFromQuery: query.destAddress,
            destination_address,
            storedAddresses,
        })
    }, [destination, connectedWallets, manualAddressFromContext, query.destAddress, connectedWalletskey, destination_address, storedAddresses])

    const destinationAddressItem = destination && destination_address ?
        groupedAddresses?.find(a => a.address.toLowerCase() === destination_address.toLowerCase())
        : undefined

    const addressBookAddresses = groupedAddresses?.filter(a => a.group !== AddressGroup.ConnectedWallet)

    const normalizedDestAddress = useMemo(
        () => destination && destination_address
            ? new AddressClass(destination_address, destination).normalized
            : null,
        [destination_address, destination]
    );

    const connectedWallet = (destination && normalizedDestAddress)
        ? connectedWallets?.find(w =>
            w.addresses?.some(a =>
                new AddressClass(a, destination).normalized === normalizedDestAddress
            )
        )
        : undefined;

    const handleSelectAddress = useCallback((address: string) => {
        const selected = destination && groupedAddresses?.find(a => AddressClass.equals(a.address, address, destination))
        const formattedAddress = selected?.address
        updateDestAddress(formattedAddress)
        close()
    }, [close, setFieldValue, groupedAddresses])

    const onConnect = (wallet: Wallet) => {
        setFieldValue('destination_address', wallet.address)
        selectDestinationAccount({
            address: wallet.address,
            id: wallet.id,
            providerName: wallet.providerName
        });
        captureEvent('destination_address_set', { source: 'connected_wallet', network: destination?.caip2Id })
        close()
    }

    useEffect(() => {
        if (destinationAddressItem && !defaultAccount?.address && destinationAddressItem?.group == AddressGroup.ConnectedWallet) {
            updateDestAddress(undefined, 'auto')
            return
        }
        if (destination_address?.toLowerCase() !== defaultAccount?.address?.toLowerCase() && (!destinationAddressItem || destinationAddressItem?.group === AddressGroup.ConnectedWallet)) {
            updateDestAddress(defaultAccount?.address, 'auto')
            setShowAddressModal(false)
        }
    }, [defaultAccount?.address, destinationAddressItem])

    const updateDestAddress = useCallback((address: string | undefined, origin: 'user' | 'auto' = 'user') => {
        const wallet = destination && connectedWallets?.find(w => w.addresses?.some(a => AddressClass.equals(a, address || '', destination)))
        setFieldValue('destination_address', address)

        if (origin === 'user' && address) {
            captureEvent('destination_address_set', {
                source: wallet ? 'connected_wallet' : 'manual',
                network: destination?.caip2Id,
            })
        }

        if (destination && address && provider) {
            if (wallet)
                selectDestinationAccount({
                    address: address,
                    id: wallet.id,
                    providerName: wallet.providerName
                });
            else {
                selectDestinationAccount({
                    address: address || "",
                    id: 'manually_added',
                    providerName: provider.name,
                });
                addAddress(address);
            }
        }
    }, [destination, connectedWallets, provider, selectDestinationAccount, addAddress]);

    useEffect(() => {
        if (canFocus) {
            inputReference?.current?.focus()
        }
    }, [canFocus])

    return (
        <>
            <AddressButton
                addressItem={destinationAddressItem}
                openAddressModal={() => setShowAddressModal(true)}
                connectedWallet={connectedWallet}
                partner={partner}
                destination={destination}
            >{children({ destination, addressItem: destinationAddressItem, connectedWallet: connectedWallet, partner })}</AddressButton>
            <VaulDrawer
                mode="fitHeight"
                header='Send To'
                show={showAddressModal}
                setShow={setShowAddressModal}
                modalId="address"
            >
                <VaulDrawer.Snap id="item-1" className="pb-0">
                    <div className='w-full flex flex-col text-primary-text'>
                        <div className='flex flex-col self-center w-full space-y-5'>

                            {
                                destination
                                && provider
                                && !connectedWallets.length &&
                                <ConnectWalletButton
                                    provider={provider}
                                    onConnect={onConnect}
                                />
                            }

                            <ManualAddressInput
                                manualAddress={manualAddress}
                                setManualAddress={setManualAddress}
                                setNewAddress={(props) => updateDestAddress(props?.address)}
                                values={values}
                                partner={partner}
                                name={name}
                                inputReference={inputReference}
                                setFieldValue={setFieldValue}
                                close={close}
                                addresses={groupedAddresses}
                            />
                            {
                                destination
                                && provider
                                && !manualAddress &&
                                <ConnectedWallets
                                    provider={provider}
                                    notCompatibleWallets={unAvailableWallets}
                                    onClick={(props) => handleSelectAddress(props.address)}
                                    onConnect={onConnect}
                                    destination={destination}
                                    destination_address={destination_address}
                                />
                            }

                            {
                                addressBookAddresses && addressBookAddresses?.length > 0 && !manualAddress && destination &&
                                <AddressBook
                                    addressBook={addressBookAddresses}
                                    onSelectAddress={handleSelectAddress}
                                    destination={destination}
                                    destination_address={destination_address}
                                    partner={partner}
                                />
                            }
                        </div>
                    </div>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
});

const resolveAddressGroups = ({
    destination,
    wallets,
    manualAddressFromContext,
    addressFromQuery,
    storedAddresses,
}: {
    destination: Network | undefined,
    wallets: Wallet[] | undefined,
    manualAddressFromContext: string | undefined,
    addressFromQuery: string | undefined,
    destination_address: string | undefined,
    storedAddresses: AddressItem[],
}) => {

    if (!destination) return

    let addresses: AddressItem[] = []
    wallets?.forEach(wallet => {
        if (wallet?.addresses?.length) {
            addresses.push(...(wallet.addresses.map(a => ({ address: a, group: AddressGroup.ConnectedWallet, wallet })) || []))
        }
    })
    if (addressFromQuery && AddressClass.isValid(addressFromQuery, destination)) {
        addresses.push({ address: addressFromQuery, group: AddressGroup.FromQuery })
    }

    // Include manually added address from context (shared across all instances)
    if (manualAddressFromContext && AddressClass.isValid(manualAddressFromContext, destination)) {
        addresses.push({ address: manualAddressFromContext, group: AddressGroup.ManualAdded })
    }

    // Include all previously used manual addresses from store
    storedAddresses.forEach(item => {
        if (AddressClass.isValid(item.address, destination)) {
            addresses.push(item)
        }
    })

    const uniqueAddresses = getUniqueAddresses(addresses, destination)

    return uniqueAddresses
}


const getUniqueAddresses = (addresses: AddressItem[], destination: Network) => {
    const normalizedMap = new Map<string, AddressItem>();

    addresses.forEach((a) => {
        const normalized = new AddressClass(a.address, destination).normalized;
        if (!normalizedMap.has(normalized)) {
            normalizedMap.set(normalized, a);
        }
    });

    return Array.from(normalizedMap.values());
}

export default AddressPicker