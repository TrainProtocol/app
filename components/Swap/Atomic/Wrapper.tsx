import Image from "next/image";
import { FC } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import { ApiResponse } from "../../../Models/ApiResponse";
import { Partner } from "../../../Models/Partner";
import useSWR from 'swr'
import { useQueryState } from "../../../context/query";
import { Network, Token } from "../../../Models/Network";
import { addressFormat } from "../../../lib/address/formatter";
import { ExtendedAddress } from "../../Input/Address/AddressPicker/AddressWithIcon";
import { isValidAddress } from "../../../lib/address/validator";

type SwapInfoProps = {
    sourceCurrency: Token,
    destinationCurrency: Token,
    source: Network,
    destination: Network;
    requestedAmount: number | undefined;
    receiveAmount: number | undefined;
    destinationAddress: string;
    fee?: number,
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    sourceAccountAddress: string
}

const Wrapper: FC<SwapInfoProps> = ({ sourceAccountAddress, sourceCurrency, destinationCurrency, source: from, destination: to, requestedAmount, destinationAddress, receiveAmount }) => {

    const {
        hideFrom,
        hideTo,
        account,
        appName,
        hideAddress
    } = useQueryState()

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = partnerData?.data

    const source = (hideFrom && partner && account) ? partner : from
    const destination = (hideTo && partner && account) ? partner : to

    const requestedAmountInUsd = requestedAmount && (sourceCurrency?.price_in_usd * requestedAmount).toFixed(2)
    const destAddress = (hideAddress && hideTo && account) ? account : destinationAddress

    return (
        <div>
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        {
                            source ?
                                <Image src={source.logo} alt={source.display_name} width={32} height={32} className="rounded-lg" />
                                :
                                null
                        }
                        <div>
                            <p className="text-primary-text text-sm leading-5">{source?.display_name}</p>
                            {
                                sourceAccountAddress ?
                                    isValidAddress(sourceAccountAddress, from) ?
                                        <div className="text-sm group/addressItem text-secondary-text">
                                            <ExtendedAddress address={addressFormat(sourceAccountAddress, from)} network={from} />
                                        </div>
                                        :
                                        <p className="text-sm text-secondary-text">{sourceAccountAddress}</p>
                                    :
                                    null
                            }
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        {
                            requestedAmount &&
                            <p className="text-primary-text text-sm">{truncateDecimals(requestedAmount, Math.min(sourceCurrency.decimals, 8))} {sourceCurrency.symbol}</p>
                        }
                        <p className="text-secondary-text text-sm flex justify-end">${requestedAmountInUsd}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between  w-full ">
                    <div className="flex items-center gap-3">
                        {
                            destination ?
                                <Image src={destination.logo} alt={destination.display_name} width={32} height={32} className="rounded-lg" />
                                :
                                null
                        }
                        <div className="group/addressItem text-sm text-secondary-text">
                            <p className="text-primary-text leading-5">{destination?.display_name}</p>
                            <ExtendedAddress address={addressFormat(destAddress, to)} network={to} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Wrapper