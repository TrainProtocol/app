import { ChevronDown, PlusIcon } from "lucide-react";
import { AddressGroup, AddressItem, AddressTriggerProps } from "./Address/AddressPicker";
import { Partner } from "@/Models/Partner";
import AddressIcon from "../AddressIcon";
import type { Wallet } from "@layerswap/widget-types";
import { ImageWithFallback } from "@layerswap/ui-kit/components";
import clsx from 'clsx';
import { Address } from "@/lib/address";
import WalletIconView from "@/components/Wallet/WalletIconView";
import { captureEvent } from "@/lib/faro";

const DestinationWalletPicker = (props: AddressTriggerProps) => {
    const { addressItem, connectedWallet, partner, destination } = props
    return destination && <div
        onClick={() => captureEvent(addressItem ? "address_item_clicked" : "add_address_clicked")}
        className={clsx(
            "flex items-center space-x-2 text-sm rounded-lg py-1 px-2 justify-self-end",
            {
                "hover:bg-secondary-400": addressItem,
                "bg-secondary-400 hover:bg-secondary-300": !addressItem
            }
        )}>
        <div className="rounded-lg flex space-x-1 items-center cursor-pointer">
            {
                addressItem &&
                <>
                    <div className="inline-flex items-center relative px-0.5">
                        <ResolvedIcon addressItem={addressItem} partner={partner} wallet={connectedWallet} destination={destination} />
                    </div>
                    <div className="text-secondary-text">
                        {new Address(addressItem.address, destination).toShortString()}
                    </div>
                    <div className="w-4 h-4 items-center flex text-secondary-text">
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </div>
                </>
            }
            {
                !addressItem &&
                <>
                    <div className="inline-flex items-center relative px-0.5">
                        <PlusIcon className="w-5 h-5 p-0.5 text-secondary-text" />
                    </div>
                    <div className="text-secondary-text break-keep">
                        <p>
                            Add Address
                        </p>
                    </div>
                    <div className="w-4 h-4 items-center flex text-secondary-text">
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </div>
                </>
            }
        </div>
    </div>
}
type AdderssIconprops = {
    addressItem: AddressItem,
    wallet: Wallet | undefined,
    partner: Partner | undefined,
    destination: AddressTriggerProps['destination']
}
const ResolvedIcon = (props: AdderssIconprops) => {
    const { addressItem, wallet, partner, destination } = props
    if (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) {
        return <ImageWithFallback
            alt="Partner logo"
            className='rounded-md object-contain'
            src={partner.logo}
            width="16"
            height="26"
        />
    }
    else if (addressItem.group === AddressGroup.ConnectedWallet && wallet) {
        return <WalletIconView wallet={wallet} className="w-4 h-4 rounded" />
    }
    else {
        return <AddressIcon className="h-4 w-4 p-0.5" address={destination ? new Address(addressItem.address, destination).full : addressItem.address} size={20} />
    }
}

export default DestinationWalletPicker
