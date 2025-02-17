import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "../../../lib/mainStepValidator";
import SwapForm from "./Form";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import { useQueryState } from "../../../context/query";
import { useFee } from "../../../context/feeContext";
import useWallet from "../../../hooks/useWallet";
import { dynamicWithRetries } from "../../../lib/dynamicWithRetries";
import { useAddressesStore } from "../../../stores/addressesStore";

const SwapDetails = dynamicWithRetries(() => import("../Atomic"),
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
    const [showSwapModal, setShowSwapModal] = useState(false);
    const [isAddressFromQueryConfirmed, setIsAddressFromQueryConfirmed] = useState(false);
    const router = useRouter();
    const addresses = useAddressesStore(state => state.addresses)

    const query = useQueryState()

    const { minAllowedAmount, maxAllowedAmount, updatePolling: pollFee, mutateLimits } = useFee()
    const { getProvider } = useWallet()

    const handleSubmit = useCallback(async (values: SwapFormValues) => {
        try {
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
            const destination_provider = values.from && getProvider(values.from, 'autofil')

            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }

            // const { commitId, hash } = await source_provider.createPreHTLC({
            //     abi: details.abi,
            //     address: values.destination_address,
            //     amount: values.amount,
            //     destinationChain: values.to?.name,
            //     sourceChain: values.from?.name,
            //     destinationAsset: values.toCurrency.symbol,
            //     sourceAsset: values.fromCurrency.symbol,
            //     lpAddress: values.from.metadata.lp_address,
            //     tokenContractAddress: values.fromCurrency.contract,
            //     decimals: values.fromCurrency.decimals,
            //     atomicContrcat: values.from.metadata.htlc_contract as `0x${string}`,
            //     chainId: values.from?.chain_id,
            // })
            // router.push(`/commitment/${commitId}?network=${values.from?.name}`)

            return await router.push({
                pathname: `/atomic`,
                query: {
                    amount: values.amount,
                    address: values.destination_address,
                    source: values.from?.name,
                    destination: values.to?.name,
                    source_asset: values.fromCurrency.symbol,
                    destination_asset: values.toCurrency.symbol,
                }
            }, undefined, { shallow: false })
        }
        catch (error) {
            console.log(error)
        }
    }, [query, router, getProvider])

    // const initialValues: SwapFormValues = swapResponse ? generateSwapInitialValuesFromSwap(swapResponse, settings)
    //     : generateSwapInitialValues(settings, query)

    useEffect(() => {
        formikRef.current?.validateForm();
    }, [minAllowedAmount, maxAllowedAmount]);

    // const handleShowSwapModal = useCallback((value: boolean) => {
    //     pollFee(!value)
    //     setShowSwapModal(value)
    //     value && swap?.id ? setSwapPath(swap?.id, router) : removeSwapPath(router)
    // }, [router, swap])

    return <>
        {/* <div className="rounded-r-lg cursor-pointer absolute z-10 md:mt-3 border-l-0">
            <AnimatePresence mode='wait'>
                {
                    swap &&
                    !showSwapModal &&
                    <PendingSwap key="pendingSwap" onClick={() => handleShowSwapModal(true)} />
                }
            </AnimatePresence>
        </div> */}
        {/* <Modal
            height='fit'
            show={showSwapModal}
            setShow={handleShowSwapModal}
            header={`Complete the swap`}
            modalId="showSwap"
        >
            <ResizablePanel>
                <>
                </>
            </ResizablePanel>
        </Modal> */}
        <Formik
            innerRef={formikRef}
            initialValues={{}}
            validateOnMount={true}
            validate={MainStepValidation({ minAllowedAmount, maxAllowedAmount })}
            onSubmit={handleSubmit}
        >
            <>
                <SwapForm />
            </>
        </Formik>
    </>
}

const textMotion = {
    rest: {
        color: "grey",
        x: 0,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeIn"
        }
    },
    hover: {
        color: "blue",
        x: 30,
        transition: {
            duration: 0.4,
            type: "tween",
            ease: "easeOut"
        }
    }
};


const setSwapPath = (swapId: string, router: NextRouter) => {
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap/${swapId}`;
    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            swapURL += `?${search}`
    }
    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
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
    window.history.replaceState({ ...window.history.state, as: homeURL, url: homeURL }, '', homeURL);
}