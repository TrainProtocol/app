import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "@/lib/mainStepValidator";
import SwapForm from "./Form";
import { NextRouter, useRouter } from "next/router";
import { useQueryState } from "@/context/query";
import useWallet from "@/hooks/useWallet";
import { useSwapProgress, type SwapQuote, HTLCStatus, useSharedSecretDerivation } from "@train-protocol/react";
import VaulDrawer from "../../Modal/vaulModal";
import { Widget } from "../../Widget/Index";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { useSettingsState } from "@/context/settings";
import { resolvePersistantQueryParams } from "@/helpers/querryHelper";
import { useSwapStore } from "@/stores/swapStore";
import { useActiveSwap } from "@/hooks/useActiveSwap";

import AtomicPage from "../AtomicChat";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";

export default function Form() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const router = useRouter();
    const query = useQueryState()
    const { isLoggedIn } = useSharedSecretDerivation()
    const [quote, setQuote] = useState<SwapQuote | undefined>()
    const [solverId, setSolverId] = useState<string | undefined>()
    const [polling, setPolling] = useState(true)
    const { getProvider } = useWallet()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const settings = useSettingsState()
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const updateRecentNetworks = useRecentNetworksStore(s => s.updateRecentNetworks);
    const swap = useActiveSwap()

    // Monitor the active swap lifecycle
    const { status: htlcStatus } = useSwapProgress(activeHashlock)

    useEffect(() => {
        if (swapModalOpen) {
            setPolling(false);
            if (swap.source && swap.txId) {
                setSwapInUrl(router, swap.source, swap.txId);
            }
        } else {
            setPolling(true);
            removeSwapPath(router);
        }
    }, [swapModalOpen, swap.source, swap.txId, router]);

    const handleShowSwapModal = useCallback((value: boolean) => {
        setSwapModalOpen(value);
    }, [setSwapModalOpen]);

    const handleDrawerAnimationEnd = useCallback((open: boolean) => {
        if (!open) {
            const isTerminal = htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded
            if (isTerminal) {
                setActiveHashlock(null)
            }
        }
    }, [htlcStatus, setActiveHashlock]);

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            if (!isLoggedIn) {
                throw new Error("Please login first")
            }

            if (!values.amount) throw new Error("No amount specified")
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

            // Reset any previous swap so the modal starts fresh
            setActiveHashlock(null)

            // Open the swap modal — pre-lock data comes from Formik context,
            // UserLockAction inside will call createSwap
            setSwapModalOpen(true)
            setPolling(false)
        }
        catch (error) {
            console.log(error)
        }
    }, [query, router, getProvider, isLoggedIn, quote, solverId])

    const initialValues: SwapFormValues = generateSwapInitialValues(settings, query)

    return <>
        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation()}
            onSubmit={handleSubmit}
        >
            <>
                <VaulDrawer
                    mode="fitHeight"
                    show={swapModalOpen}
                    setShow={handleShowSwapModal}
                    header="Complete the swap"
                    modalId="showAtomicSwap"
                    className="expandContainerHeight"
                    onAnimationEnd={handleDrawerAnimationEnd}
                >
                    <AtomicPage type='contained' />
                </VaulDrawer>
                <Widget>
                    <SwapForm polling={polling} onQuoteChange={(q, id) => { setQuote(q); setSolverId(id) }} />
                </Widget>
            </>
        </Formik>
    </>
}

const removeSwapPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            homeURL += `?${search}`
    }

    window.history.replaceState({ ...window.history.state, as: router.asPath, url: homeURL }, '', homeURL);
}

const setSwapInUrl = (router: NextRouter, sourceNetwork: string, txHash: string) => {
    const basePath = router?.basePath || ""
    let url = window.location.protocol + "//" + window.location.host + `${basePath}/swap`
    const params = resolvePersistantQueryParams(router.query)
    const atomicParams = new URLSearchParams({ sourceNetwork, txHash })
    url += `?${atomicParams}`
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        url += `&${search}`
    }
    window.history.replaceState({ ...window.history.state, as: url, url }, '', url);
}
