"use client"

import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "@/lib/mainStepValidator";
import SwapForm from "./Form";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { useQueryState } from "@/context/query";
import useWallet from "@/hooks/useWallet";
import { type SwapQuote, useSharedSecretDerivation } from "@train-protocol/react";
import { Widget } from "../../Widget/Index";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { useSettingsState } from "@/context/settings";
import { getPersistantSearchParams, silentReplaceState } from "@/helpers/querryHelper";
import { buildSwapQuery } from "@/helpers/swapUrl";
import { useSwapStore } from "@/stores/swapStore";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";

export default function Form() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const searchParams = useSearchParams();
    const query = useQueryState()
    const { isLoggedIn } = useSharedSecretDerivation()
    const [quote, setQuote] = useState<SwapQuote | undefined>()
    const [solverId, setSolverId] = useState<string | undefined>()
    const [polling, setPolling] = useState(true)
    const { getProvider } = useWallet()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const settings = useSettingsState()
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const setPendingFormValues = useSwapStore(s => s.setPendingFormValues)
    const updateRecentNetworks = useRecentNetworksStore(s => s.updateRecentNetworks);
    const swap = useActiveSwap()

    useEffect(() => {
        if (swapModalOpen) {
            setPolling(false);
            if (swap.source && swap.txId) {
                setSwapInUrl(searchParams, swap.source, swap.txId);
            }
        } else {
            setPolling(true);
            removeSwapPath(searchParams);
        }
    }, [swapModalOpen, swap.source, swap.txId, searchParams]);

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            if (!isLoggedIn) {
                throw new Error("Please login first")
            }

            if (!values.amount && !values.receiveAmount) throw new Error("No amount specified")
            if (!values.destination_address) throw new Error("Please enter a valid address")
            if (!values.fromCurrency) throw new Error("No source asset")
            if (!values.toCurrency) throw new Error("No destination asset")

            const source_provider = values.from && getProvider(values.from, 'withdrawal')
            const destination_provider = values.to && getProvider(values.to, 'withdrawal')

            if (!source_provider) throw new Error("No source_provider")
            if (!destination_provider) throw new Error("No destination_provider")

            updateRecentNetworks({
                from: values.from && values.fromCurrency ? { network: values.from.caip2Id, token: values.fromCurrency.symbol } : undefined,
                to: values.to && values.toCurrency ? { network: values.to.caip2Id, token: values.toCurrency.symbol } : undefined,
            })

            setActiveHashlock(null)
            setPendingFormValues(values)
            setSwapModalOpen(true)
            setPolling(false)
        }
        catch (error) {
            console.log(error)
        }
    }, [query, getProvider, isLoggedIn, quote, solverId])

    const initialValues: SwapFormValues = generateSwapInitialValues(settings, query)

    return <>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation}
            onSubmit={handleSubmit}
        >
            <Widget>
                <SwapForm polling={polling} onQuoteChange={(q, id) => { setQuote(q); setSolverId(id) }} />
            </Widget>
        </Formik>
    </>
}

const removeSwapPath = (searchParams: ReadonlyURLSearchParams | null) => {
    const params = new URLSearchParams(getPersistantSearchParams(searchParams))
    const qs = params.toString()
    silentReplaceState(qs ? `/?${qs}` : "/")
}

const setSwapInUrl = (searchParams: ReadonlyURLSearchParams | null, sourceNetwork: string, txHash: string) => {
    const atomicParams = new URLSearchParams(buildSwapQuery(sourceNetwork, txHash))
    const persistant = new URLSearchParams(getPersistantSearchParams(searchParams))
    for (const [key, value] of persistant.entries()) {
        atomicParams.set(key, value)
    }
    silentReplaceState(`/swap?${atomicParams.toString()}`)
}
