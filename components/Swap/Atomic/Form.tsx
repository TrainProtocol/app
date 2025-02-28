import { Form, FormikErrors, useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import SwapButton from "../../buttons/swapButton";
import React from "react";
import NetworkFormField from "../../Input/NetworkFormField";
import LayerSwapApiClient from "../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWR from "swr";
import { ApiResponse } from "../../../Models/ApiResponse";
import { motion, useCycle } from "framer-motion";
import { ArrowUpDown, Loader2 } from 'lucide-react'
import { Widget } from "../../Widget/Index";
import { classNames } from "../../utils/classNames";
import { useQueryState } from "../../../context/query";
import FeeDetailsComponent from "../../FeeDetails";
import { useFee } from "../../../context/feeContext";
import AmountField from "../../Input/Amount"
import dynamic from "next/dynamic";
import { Balance } from "../../../Models/Balance";
import ResizablePanel from "../../ResizablePanel";
import { Network } from "../../../Models/Network";
import { resolveRoutesURLForSelectedToken } from "../../../helpers/routes";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import useWallet from "../../../hooks/useWallet";
import FormButton from "../FormButton";

const ReserveGasNote = dynamic(() => import("../../ReserveGasNote"), {
    loading: () => <></>,
});

const SwapForm: FC = () => {
    const {
        values,
        setValues,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
        fromCurrency,
        toCurrency,
        from: source,
    } = values
    const { selectedSourceAccount } = useSwapDataState()
    const { setSelectedSourceAccount } = useSwapDataUpdate()
    const { providers, wallets } = useWallet()
    const { minAllowedAmount, valuesChanger } = useFee()

    const layerswapApiClient = new LayerSwapApiClient()
    const query = useQueryState();
    let valuesSwapperDisabled = false;

    const actionDisplayName = query?.actionButtonText || "Swap now"

    useEffect(() => {
        valuesChanger(values)
    }, [values])

    useEffect(() => {
        if (values.refuel && minAllowedAmount && (Number(values.amount) < minAllowedAmount)) {
            setFieldValue('amount', minAllowedAmount)
        }
    }, [values.refuel, destination, minAllowedAmount])

    const [animate, cycle] = useCycle(
        { rotate: 0 },
        { rotate: 180 }
    );

    const sourceRoutesEndpoint = (source || destination) ? resolveRoutesURLForSelectedToken({ direction: 'from', network: source?.name, token: fromCurrency?.symbol, includes: { unavailable: true, unmatched: true } }) : null
    const destinationRoutesEndpoint = (source || destination) ? resolveRoutesURLForSelectedToken({ direction: 'to', network: destination?.name, token: toCurrency?.symbol, includes: { unavailable: true, unmatched: true } }) : null

    const { data: sourceRoutesRes, isLoading: sourceLoading } = useSWR<ApiResponse<Network[]>>(sourceRoutesEndpoint, layerswapApiClient.fetcher, { keepPreviousData: true })
    const { data: destinationRoutesRes, isLoading: destinationLoading } = useSWR<ApiResponse<Network[]>>(destinationRoutesEndpoint, layerswapApiClient.fetcher, { keepPreviousData: true })
    const sourceRoutes = sourceRoutesRes?.data
    const destinationRoutes = destinationRoutesRes?.data
    const sourceCanBeSwapped = !source ? true : (destinationRoutes?.some(l => l.name === source?.name && l.tokens.some(t => t.symbol === fromCurrency?.symbol
        // && t.status === 'active'
    )) ?? false)
    const destinationCanBeSwapped = !destination ? true : (sourceRoutes?.some(l => l.name === destination?.name && l.tokens.some(t => t.symbol === toCurrency?.symbol
        // && t.status === 'active'
    )) ?? false)

    if (query.lockTo || query.lockFrom || query.hideTo || query.hideFrom) {
        valuesSwapperDisabled = true;
    }
    if (!sourceCanBeSwapped || !destinationCanBeSwapped) {
        valuesSwapperDisabled = true;
    } else if (!source && !destination) {
        valuesSwapperDisabled = true;
    }

    const valuesSwapper = useCallback(() => {

        const newFrom = sourceRoutes?.find(l => l.name === destination?.name)
        const newTo = destinationRoutes?.find(l => l.name === source?.name)
        const newFromToken = newFrom?.tokens.find(t => t.symbol === toCurrency?.symbol)
        const newToToken = newTo?.tokens.find(t => t.symbol === fromCurrency?.symbol)

        const destinationProvider = destination
            ? providers.find(p => p.autofillSupportedNetworks?.includes(destination?.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase())))
            : undefined

        const newDestinationProvider = newTo ? providers.find(p => p.autofillSupportedNetworks?.includes(newTo.name) && p.connectedWallets?.some(w => !w.isNotAvailable && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address.toLowerCase())))
            : undefined
        const oldDestinationWallet = newDestinationProvider?.connectedWallets?.find(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase()))
        const oldDestinationWalletIsNotCompatible = destinationProvider && (destinationProvider?.name !== newDestinationProvider?.name || !(newTo && oldDestinationWallet?.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo?.name.toLowerCase())))
        const destinationWalletIsAvailable = newTo ? newDestinationProvider?.connectedWallets?.some(w => w.autofillSupportedNetworks?.some(n => n.toLowerCase() === newTo.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount?.address.toLowerCase())) : undefined
        const oldSourceWalletIsNotCompatible = destinationProvider && (selectedSourceAccount?.wallet.providerName !== destinationProvider?.name || !(newFrom && selectedSourceAccount?.wallet.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === newFrom.name.toLowerCase())))

        const changeDestinationAddress = newTo && (oldDestinationWalletIsNotCompatible || oldSourceWalletIsNotCompatible) && destinationWalletIsAvailable

        const newVales: SwapFormValues = {
            ...values,
            from: newFrom,
            to: newTo,
            fromCurrency: newFromToken,
            toCurrency: newToToken,
            destination_address: values.destination_address,
            depositMethod: undefined
        }

        if (changeDestinationAddress) {
            newVales.destination_address = selectedSourceAccount?.address
        }

        setValues(newVales, true);

        const changeSourceAddress = newFrom && values.depositMethod === 'wallet' && destinationProvider && (oldSourceWalletIsNotCompatible || changeDestinationAddress)
        if (changeSourceAddress && values.destination_address) {
            const sourceAvailableWallet = destinationProvider?.connectedWallets?.find(w => w.withdrawalSupportedNetworks?.some(n => n.toLowerCase() === newFrom.name.toLowerCase()) && w.addresses.some(a => a.toLowerCase() === values.destination_address?.toLowerCase()))
            if (sourceAvailableWallet) {
                setSelectedSourceAccount({
                    wallet: sourceAvailableWallet,
                    address: values.destination_address
                })
            }
            else {
                setSelectedSourceAccount(undefined)
            }

        }
    }, [values, sourceRoutes, destinationRoutes, sourceCanBeSwapped, selectedSourceAccount])

    const handleReserveGas = useCallback((walletBalance: Balance, networkGas: number) => {
        if (walletBalance && networkGas)
            setFieldValue('amount', walletBalance?.amount - networkGas)
    }, [values.amount])


    const sourceWalletNetwork = values.from
    const shouldConnectWallet = (sourceWalletNetwork && !selectedSourceAccount) || (!values.from && !wallets.length)

    return <>
        <Form className={`h-full ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
            <ResizablePanel>
                <Widget.Content>
                    <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3.5 leading-4 bg-secondary-700 rounded-xl'>
                        {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                            <NetworkFormField direction="from" label="From" className="rounded-t-componentRoundness pt-2.5" />
                        </div>}
                        {!query?.hideFrom && !query?.hideTo &&
                            <button
                                type="button"
                                aria-label="Reverse the source and destination"
                                disabled={valuesSwapperDisabled || sourceLoading || destinationLoading}
                                onClick={valuesSwapper}
                                className={`${sourceLoading || destinationLoading ? "" : "hover:text-primary"} absolute right-[calc(50%-16px)] top-[122px] z-10 border-2 border-secondary-900 bg-secondary-900 rounded-[10px] disabled:cursor-not-allowed disabled:text-secondary-text duration-200 transition disabled:pointer-events-none`}>
                                <motion.div
                                    animate={animate}
                                    transition={{ duration: 0.3 }}
                                    onTap={() => !valuesSwapperDisabled && cycle()}
                                >
                                    {sourceLoading || destinationLoading ?
                                        <Loader2 className="opacity-50 w-7 h-auto p-1 bg-secondary-900 border-2 border-secondary-500 rounded-lg disabled:opacity-30 animate-spin" />
                                        :
                                        <ArrowUpDown className={classNames(valuesSwapperDisabled && 'opacity-50', "w-7 h-auto p-1 bg-secondary-900 border-2 border-secondary-500 rounded-lg disabled:opacity-30")} />
                                    }
                                </motion.div>
                            </button>}
                        {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                            <NetworkFormField direction="to" label="To" className="rounded-b-componentRoundness" />
                        </div>}
                    </div>
                    <div className="mb-6 leading-4">
                        <AmountField />
                    </div>
                    <div className="w-full">
                        <FeeDetailsComponent values={values} />
                        {
                            values.amount &&
                            <ReserveGasNote onSubmit={(walletBalance, networkGas) => handleReserveGas(walletBalance, networkGas)} />
                        }
                    </div>
                </Widget.Content>
            </ResizablePanel>
            <Widget.Footer>
                <FormButton
                    shouldConnectWallet={shouldConnectWallet}
                    values={values}
                    isValid={isValid}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    actionDisplayName={actionDisplayName}
                />
            </Widget.Footer>
        </Form>
    </>
}

export default SwapForm