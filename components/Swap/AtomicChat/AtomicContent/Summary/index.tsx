import { FC, useEffect } from "react";
import { useAtomicState, CommitStatus } from "../../../../../context/atomicContext";
import { useFee } from "../../../../../context/feeContext";
import { useSettingsState } from "../../../../../context/settings";
import Summary from "./Summary";
import Details from "./Details";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../../shadcn/accordion";
import { formatUnits } from "fuels";

const MotionSummary: FC = () => {

    const { networks } = useSettingsState()
    const { fee, valuesChanger } = useFee()
    const { atomicQuery, commitStatus, commitFromApi, source_asset: source_token, destination_asset: destination_token } = useAtomicState()
    const { source, destination, amount, address, source_asset, destination_asset } = atomicQuery;

    const source_network = networks.find(n => n.slug.toUpperCase() === source?.toUpperCase())
    const destination_network = networks.find(n => n.slug.toUpperCase() === destination?.toUpperCase())

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

    const receive_amount_in_base_units = fee?.quote?.receiveAmount
    const receive_amount = (receive_amount_in_base_units && source_token) ? (Number(receive_amount_in_base_units) / Math.pow(10, source_asset?.decimals)) : undefined;

    const receiveAmount = commitFromApi?.destinationAmount ? formatUnits(commitFromApi?.destinationAmount, destination_token?.decimals) : fee?.quote?.receiveAmount ? formatUnits(fee?.quote?.receiveAmount, destination_token?.decimals) : undefined

    const assetsLocked = commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted
    return (
        <>
            {
                destination_network && source_network && destination_token && source_token &&
                <Summary
                    destination={destination_network}
                    source={source_network}
                    destinationCurrency={destination_token}
                    requestedAmount={amount}
                    sourceCurrency={source_token}
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
                            <AccordionTrigger className="w-fit text-secondary-text text-base">View details</AccordionTrigger>
                        </div>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}

export default MotionSummary;