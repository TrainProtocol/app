import { ComponentProps, FC, useMemo } from "react"
import { AddressGroup, AddressItem } from ".";
import { AddressIcon, ExtendedAddress as BaseExtendedAddress, ImageWithFallback, WalletIconView } from "@layerswap/ui-kit";
import { Address } from "@/lib/address";
import { History, Pencil, Link2 } from "lucide-react";
import { Partner } from "@/Models/Partner";
import { Network } from "@/Models/Network";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";
import { shortenString } from "@layerswap/utils";

type Props = {
    addressItem: AddressItem;
    partner?: Partner;
    network?: Network;
    balance?: { amount: number, symbol: string, isLoading: boolean } | undefined;
}

const AddressWithIcon: FC<Props> = ({ addressItem, partner, network, balance }) => {

    const difference_in_days = addressItem?.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(addressItem.date).getTime()) / (1000 * 3600 * 24))) : undefined
    const maxWalletNameWidth = calculateMaxWidth(String(balance?.amount));

    const descriptions = [
        {
            group: AddressGroup.RecentlyUsed,
            text: (difference_in_days === 0 ?
                <p>Used today</p>
                :
                (difference_in_days && difference_in_days > 1 ?
                    <p><span>Used</span> {difference_in_days} <span>days ago</span></p>
                    : <p>Used yesterday</p>))
            ,
            icon: History
        },
        {
            group: AddressGroup.ManualAdded,
            text: <p>Added Manually</p>,
            icon: Pencil
        },
        {
            group: AddressGroup.ConnectedWallet,
            text: <p className={`${maxWalletNameWidth} text-ellipsis sm:max-w-full text-nowrap overflow-hidden text-[10px]`}>{addressItem.wallet?.displayName || 'Connected wallet'}</p>,
            icon: undefined
        },
        {
            group: AddressGroup.FromQuery,
            text: <p><span>Autofilled</span> <span>{partner ? `by ${partner.display_name}` : 'from URL'}</span></p>,
            icon: Link2
        }
    ]

    const itemDescription = descriptions.find(d => d.group === addressItem.group)

    const address = useMemo(() => {
        if (network) {
            return new Address(addressItem.address, network).full
        }
        return addressItem.address
    }, [addressItem.address, network])

    return (
        <div className="w-full flex items-center justify-between">
            <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-8 overflow-hidden w-8">
                {
                    (partner?.is_wallet && addressItem.group === AddressGroup.FromQuery) ? (
                        partner?.logo && (
                            <ImageWithFallback
                                alt="Partner logo"
                                className="rounded-md object-contain"
                                src={partner.logo}
                                width="36"
                                height="36"
                            />
                        )
                    ) : (
                        <AddressIcon className="scale-150 h-9 w-9 rounded-[6px]" address={address} size={36} />
                    )
                }
            </div>

            <div className="flex flex-col items-start grow min-w-0 ml-3 text-sm">
                <div className="flex w-full min-w-0">
                    {(network || addressItem?.wallet?.providerName) ? (
                        <ExtendedAddress address={addressItem.address} network={network} providerName={addressItem?.wallet?.providerName} showDetails={addressItem.wallet ? true : false} title={addressItem.wallet?.displayName?.split("-")[0]} description={addressItem.wallet?.providerName} logo={addressItem.wallet?.icon} />
                    ) : <p className="text-sm block font-medium">
                        {shortenString(addressItem.address)}
                    </p>}
                </div>
                <div className="text-secondary-text w-full min-w-0">
                    <div className="flex items-center gap-1 text-xs">
                        {addressItem.group === AddressGroup.ConnectedWallet && addressItem.wallet ? (
                            <WalletIconView wallet={addressItem.wallet} className="rounded-sm shrink-0 h-3.5 w-3.5" size={14} />
                        ) : itemDescription?.icon && (
                            <itemDescription.icon className="rounded-sm shrink-0 h-3.5 w-3.5" />
                        )}
                        {itemDescription?.text}
                    </div>
                </div>
            </div>

            {balance && (
                <div className="shrink-0 text-sm text-secondary-text text-right ml-3">
                    {
                        balance.amount != undefined && !isNaN(balance.amount) ?
                            <div className="text-right text-secondary-text font-normal text-sm">
                                {
                                    balance.isLoading ?
                                        <div className='h-[14px] w-20 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                                        :
                                        <>
                                            <span>{balance.amount.toLocaleString()}</span> <span>{balance.symbol}</span>
                                        </>
                                }
                            </div>
                            :
                            <></>
                    }
                </div>
            )}
        </div>
    )
}

const calculateMaxWidth = (balance: string | undefined) => {
    const symbolCount = balance?.length || 0;

    if (symbolCount <= 6) {
        return '';
    } else if (symbolCount <= 12) {
        return 'max-w-[100px] mr-1';
    } else {
        return 'max-w-[50px]';
    }
};

export const ExtendedAddress: FC<Omit<ComponentProps<typeof BaseExtendedAddress>, "network"> & { network?: Network }> = ({ network, ...props }) => (
    <BaseExtendedAddress {...props} network={network && toWidgetNetwork(network)} />
)

export default AddressWithIcon
