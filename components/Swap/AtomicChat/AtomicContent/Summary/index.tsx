import { FC, useEffect, useState } from "react";
import { useAtomicState, CommitStatus } from "../../../../../context/atomicContext";
import { useFee } from "../../../../../context/feeContext";
import { useSettingsState } from "../../../../../context/settings";
import useWallet from "../../../../../hooks/useWallet";
import Summary from "./Summary";
import Details from "./Details";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../../shadcn/accordion";

const MotionSummary: FC = () => {

    const { networks } = useSettingsState()
    const { fee, valuesChanger } = useFee()
    const { sourceDetails, atomicQuery, commitStatus, commitFromApi } = useAtomicState()
    const { source, destination, amount, address, source_asset, destination_asset } = atomicQuery;

    const source_network = networks.find(n => n.name.toUpperCase() === source?.toUpperCase())
    const destination_network = networks.find(n => n.name.toUpperCase() === destination?.toUpperCase())
    const source_token = source_network?.tokens.find(t => t.symbol === source_asset)
    const destination_token = destination_network?.tokens.find(t => t.symbol === destination_asset)

    const { provider } = useWallet(source_network, 'withdrawal')

    useEffect(() => {
        if (amount && source_network && destination_network && source_asset && destination_asset)
            valuesChanger({
                amount: amount.toString(),
                from: source_network,
                fromCurrency: source_token,
                to: destination_network,
                toCurrency: destination_token,
            })
    }, [amount, source_network, destination, source_token, destination_token])

    const wallet = provider?.activeWallet
    const receiveAmount = commitFromApi?.destination_amount || fee?.quote?.receive_amount

    const assetsLocked = commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted

    return (
        <div
            className='bg-secondary-800 rounded-componentRoundness p-3 w-full relative z-10 space-y-5 border border-transparent transition-all'>
            {
                destination_network && source_network && destination_token && source_token &&
                <Summary
                    destination={destination_network}
                    source={source_network}
                    destinationAddress={address}
                    destinationCurrency={destination_token}
                    requestedAmount={amount}
                    sourceCurrency={source_token}
                    sourceAccountAddress={sourceDetails?.sender || wallet?.address}
                    receiveAmount={receiveAmount}
                />
            }
            {
                assetsLocked &&
                <Accordion type="single" collapsible >
                    <AccordionItem value="item-1" className="space-y-3">
                        <AccordionContent>
                            <Details />
                        </AccordionContent>
                        <div className="text-center flex justify-center w-full">
                            <AccordionTrigger className="w-fit text-primary-text-placeholder text-base">View details</AccordionTrigger>
                        </div>
                    </AccordionItem>
                </Accordion>
            }
        </div>
    )
}

export default MotionSummary;