import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "../../../lib/mainStepValidator";
import SwapForm from "./Form";
import { NextRouter, useRouter } from "next/router";
import { useQueryState } from "../../../context/query";
import useWallet from "../../../hooks/useWallet";
import { SwapQuote } from "../../../lib/trainApiClient";
import { dynamicWithRetries } from "../../../lib/dynamicWithRetries";
import { useAtomicState, HTLCStatus } from "../../../context/atomicContext";
import VaulDrawer from "../../Modal/vaulModal";
import { Widget } from "../../Widget/Index";
import { generateSwapInitialValues } from "../../../lib/generateSwapInitialValues";
import { useSettingsState } from "../../../context/settings";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import { useSecretDerivation } from "../../../context/secretDerivationContext";
import { useSwapStore } from "../../../stores/swapStore";
import { formatUnits } from "viem";

const AtomicPage = dynamicWithRetries(
    () => import("../AtomicChat/index.tsx") as unknown as Promise<{ default: React.ComponentType<any> }>,
    <div className="w-full h-[450px]">
        <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
                <div className="h-32 bg-secondary-700 rounded-lg"></div>
                <div className="h-40 bg-secondary-700 rounded-lg"></div>
                <div className="h-12 bg-secondary-700 rounded-lg"></div>
            </div>
        </div>
    </div>
)

export default function Form() {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const router = useRouter();
    const query = useQueryState()
    const { isLoggedIn } = useSecretDerivation()

    const [quote, setQuote] = useState<SwapQuote | undefined>()
    const [solverId, setSolverId] = useState<string | undefined>()
    const [polling, setPolling] = useState(true)
    const { getProvider } = useWallet()
    const { hashlock, htlcStatus } = useAtomicState()
    const settings = useSettingsState()
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const clearTempSwap = useSwapStore(s => s.clearTempSwap)
    const setTempSwap = useSwapStore(s => s.setTempSwap)


    useEffect(() => {
        if (swapModalOpen) {
            setPolling(false);
            if (hashlock) {
                setHashlockInUrl(router, hashlock);
            }
        } else {
            setPolling(true);
            removeSwapPath(router);
        }
    }, [swapModalOpen, hashlock, router]);

    const handleShowSwapModal = useCallback((value: boolean) => {
        setSwapModalOpen(value);
    }, [setSwapModalOpen]);

    const handleDrawerAnimationEnd = useCallback((open: boolean) => {
        if (!open) {
            clearTempSwap();
            const isTerminal = htlcStatus === HTLCStatus.RedeemCompleted || htlcStatus === HTLCStatus.Refunded
            if (isTerminal) {
                setActiveHashlock(null)
            }
        }
    }, [clearTempSwap, htlcStatus, setActiveHashlock]);

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
            // Check if user has logged in (chosen a derivation method)
            if (!isLoggedIn) {
                throw new Error("Please login first")
            }

            if (!values.amount) {
                throw new Error("No amount specified")
            }
            if (!values.destination_address) {
                throw new Error("Please enter a valid address")
            }
            if (!values.fromCurrency) {
                throw new Error("No source asset")
            }
            if (!values.toCurrency) {
                throw new Error("No destination asset")
            }

            const source_provider = values.from && getProvider(values.from, 'withdrawal')
            const destination_provider = values.to && getProvider(values.to, 'withdrawal')

            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }
            const formattedReceiveAmount = quote?.receiveAmount ? formatUnits(BigInt(quote?.receiveAmount), values.toCurrency.decimals) : undefined

            setTempSwap({
                requestedAmount: values.amount,
                address: values.destination_address,
                source: values.from?.caip2Id!,
                destination: values.to?.caip2Id!,
                source_asset: values.fromCurrency.symbol,
                destination_asset: values.toCurrency.symbol,
                solver: solverId,
                srcContract: quote?.route?.source?.tokenContract ?? undefined,
                destContract: quote?.route?.destination?.tokenContract ?? undefined,
                receiveAmount: formattedReceiveAmount,
            })
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

const setHashlockInUrl = (router: NextRouter, hashlock: string) => {
    const basePath = router?.basePath || ""
    let url = window.location.protocol + "//" + window.location.host + `${basePath}/swap`
    const params = resolvePersistantQueryParams(router.query)
    const atomicParams = new URLSearchParams({ hashlock })
    url += `?${atomicParams}`
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        url += `&${search}`
    }
    window.history.replaceState({ ...window.history.state, as: url, url }, '', url);
}
