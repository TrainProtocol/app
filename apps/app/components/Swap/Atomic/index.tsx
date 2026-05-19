"use client"

import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "@/lib/mainStepValidator";
import SwapForm from "./Form";
import { useQueryState } from "@/context/query";
import useWallet from "@/hooks/useWallet";
import { type SwapQuote, useSharedSecretDerivation } from "@train-protocol/react";
import { Widget } from "../../Widget/Index";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { useSettingsState } from "@/context/settings";
import { useSwapStore } from "@/stores/swapStore";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { FaucetNudgeChip, FaucetNudgePill } from "@/components/FaucetNudge";
import { buildHrefWithPersistantParams, replaceUrlWithoutRouting } from "@/helpers/querryHelper";
import { buildSwapQuery } from "@/helpers/swapUrl";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import useWindowDimensions from "@/hooks/useWindowDimensions";

export default function Form() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const query = useQueryState()
    const { isLoggedIn } = useSharedSecretDerivation()
    const [quote, setQuote] = useState<SwapQuote | undefined>()
    const [solverId, setSolverId] = useState<string | undefined>()
    const { getProvider } = useWallet()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const settings = useSettingsState()
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const setPendingFormValues = useSwapStore(s => s.setPendingFormValues)
    const updateRecentNetworks = useRecentNetworksStore(s => s.updateRecentNetworks);
    const searchParams = useSearchParams();
    const { isMobile } = useWindowDimensions();
    const swap = useActiveSwap();

    useEffect(() => {
        if (!isMobile) return;
        if (swapModalOpen && swap.source && swap.txId) {
            replaceUrlWithoutRouting(buildHrefWithPersistantParams("/swap", searchParams, buildSwapQuery(swap.source, swap.txId)));
        } else if (!swapModalOpen) {
            replaceUrlWithoutRouting(buildHrefWithPersistantParams("/", searchParams));
        }
    }, [isMobile, swapModalOpen, swap.source, swap.txId, searchParams]);

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            if (!isLoggedIn) {
                throw new Error("Please log in first")
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
                <FaucetNudgePill />
                <SwapForm polling={!swapModalOpen} onQuoteChange={(q, id) => { setQuote(q); setSolverId(id) }} />
                <FaucetNudgeChip />
            </Widget>
        </Formik>
    </>
}
