import Image from "next/image";
import { FC } from "react";
import { truncateDecimals } from "../../../../utils/RoundDecimals";
import { Network, Token } from "../../../../../Models/Network";
import { addressFormat } from "../../../../../lib/address/formatter";
import { ExtendedAddress } from "../../../../Input/Address/AddressPicker/AddressWithIcon";
import { isValidAddress } from "../../../../../lib/address/validator";

type AtomicSummaryProps = {
    sourceCurrency: Token,
    destinationCurrency: Token,
    source: Network,
    destination: Network;
    requestedAmount: number | undefined;
    requestedAmountInUsd?: number | undefined;
    receiveAmount: string | undefined;
    receiveAmountInUsd?: number | undefined;
    destinationAddress: string;
    fee?: number,
    sourceAccountAddress?: string,
}

const Summary: FC<AtomicSummaryProps> = ({ sourceAccountAddress, sourceCurrency, destinationCurrency, source: from, destination: to, requestedAmount, destinationAddress, receiveAmount, receiveAmountInUsd, requestedAmountInUsd }) => {

    const source = from
    const destination = to
    const destAddress = destinationAddress

    return (
        <>
            <div className="font-normal flex flex-col w-full relative z-10 space-y-5">
                <div className="space-y-1">
                    <p className="text-secondary-text text-xs">
                        Send from
                    </p>
                    <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-3">
                            <Image src={source.logo} alt={source.displayName} width={44} height={44} className="rounded-lg" />
                            <div className="text-ellipsis overflow-hidden">
                                <p className="text-primary-text truncate">{source?.displayName}</p>
                                {
                                    sourceAccountAddress && isValidAddress(sourceAccountAddress, from) ?
                                        <div className="text-sm group/addressItem text-secondary-text">
                                            <ExtendedAddress address={addressFormat(sourceAccountAddress, from)} network={from} />
                                        </div>
                                        :
                                        <p className="text-sm text-secondary-text">Network</p>
                                }
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {
                                requestedAmount &&
                                <p className="text-primary-text text-sm text-nowrap">{truncateDecimals(Number(requestedAmount), Math.min(sourceCurrency.decimals, 8))} {sourceCurrency.symbol}</p>
                            }
                            {/* <p className="text-secondary-text text-sm flex justify-end items-center">{requestedAmountInUsd ? <span>${requestedAmountInUsd.toFixed(2)}</span> : <span className="ml-1 h-[10px] w-10 animate-pulse rounded bg-gray-500" />}</p> */}
                        </div>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-secondary-text">
                        Receive at
                    </p>
                    <div className="flex items-center gap-2 justify-between w-full ">
                        <div className="flex items-center gap-3">
                            <Image src={destination.logo} alt={destination.displayName} width={44} height={44} className="rounded-lg" />
                            <div className="group/addressItem text-secondary-text text-ellipsis overflow-hidden">
                                <p className="truncate text-primary-text">{destination?.displayName}</p>
                                {
                                    !destination.name.toLowerCase().includes("aztec") ?
                                        <ExtendedAddress address={addressFormat(destAddress, to)} network={to} />
                                        : null
                                }
                            </div>
                        </div>
                        {
                            receiveAmount != undefined ?
                                <div className="flex flex-col justify-end">
                                    <p className="text-primary-text text-sm text-nowrap">{truncateDecimals(Number(receiveAmount), destinationCurrency.decimals)} {destinationCurrency.symbol}</p>
                                    {/* <p className="text-secondary-text text-sm flex justify-end">${receiveAmountInUsd && receiveAmountInUsd?.toFixed(2)}</p> */}
                                </div>
                                :
                                <div className="flex flex-col justify-end">
                                    <div className="h-[10px] my-[5px] w-20 animate-pulse rounded bg-gray-500" />
                                    <div className="h-[10px] my-[5px] w-10 animate-pulse rounded bg-gray-500 ml-auto" />
                                </div>
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

export default Summary