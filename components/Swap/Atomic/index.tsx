import { Formik, FormikProps } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import React from "react";
import MainStepValidation from "../../../lib/mainStepValidator";
import SwapForm from "./Form";
import { NextRouter, useRouter } from "next/router";
import { useQueryState } from "../../../context/query";
import { useFee } from "../../../context/feeContext";
import useWallet from "../../../hooks/useWallet";
import { dynamicWithRetries } from "../../../lib/dynamicWithRetries";
import { useAtomicState } from "../../../context/atomicContext";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import VaulDrawer from "../../Modal/vaulModal";
import { usePulsatingCircles } from "../../../context/PulsatingCirclesContext";

const AtomicPage = dynamicWithRetries(() => import("../AtomicChat"),
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
    const router = useRouter();

    const query = useQueryState()

    const { minAllowedAmount, maxAllowedAmount, updatePolling: pollFee } = useFee()
    const { getProvider } = useWallet()
    const { atomicQuery, setAtomicQuery } = useAtomicState()
    
    const {
        address,
        amount,
        destination,
        destination_asset,
        source,
        source_asset,
        commitId
    } = atomicQuery

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
            setAtomicQuery({
                amount: values.amount,
                address: values.destination_address,
                source: values.from?.name!,
                destination: values.to?.name!,
                source_asset: values.fromCurrency.symbol,
                destination_asset: values.toCurrency.symbol,
            })
            setAtomicPath({
                atomicQuery: {
                    amount: values.amount,
                    address: values.destination_address,
                    source: values.from?.name!,
                    destination: values.to?.name!,
                    source_asset: values.fromCurrency.symbol,
                    destination_asset: values.toCurrency.symbol,
                },
                router
            })
            handleShowSwapModal(true)
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

    const handleShowSwapModal = useCallback((value: boolean) => {
        pollFee(!value)
        setShowSwapModal(value)
        value ? (atomicQuery.source && setAtomicPath({ atomicQuery, router })) : removeSwapPath(router)
    }, [router, atomicQuery])

    return <>
        <AnimatePresence mode='wait'>
            {
                commitId &&
                !showSwapModal &&
                <div className="rounded-r-lg cursor-pointer absolute z-10 md:mt-3 border-l-0">
                    <PendingSwap key="pendingSwap" onClick={() => handleShowSwapModal(true)} />
                </div>
            }
        </AnimatePresence>
        <VaulDrawer
            show={showSwapModal}
            setShow={handleShowSwapModal}
            header={'Complete the swap'}
            modalId={"showSwap"}
        >
            <VaulDrawer.Snap id='item-1'>
                <AtomicPage
                    address={address as string}
                    amount={Number(amount)}
                    destination={destination as string}
                    destination_asset={destination_asset as string}
                    source={source as string}
                    source_asset={source_asset as string}
                    type='contained'
                />
            </VaulDrawer.Snap>
        </VaulDrawer>
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


const setAtomicPath = ({
    atomicQuery,
    router
}: {
    atomicQuery: any
    router: NextRouter
}) => {
    const basePath = router?.basePath || ""
    var atomicURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/atomic`;
    const atomicParams = new URLSearchParams({ ...atomicQuery })
    if (atomicParams) {
        atomicURL += `?${atomicParams}`
    }
    window.history.pushState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);
}

const removeSwapPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let homeURL = window.location.protocol + "//"
        + window.location.host + basePath

    window.history.replaceState({ ...window.history.state, as: homeURL, url: homeURL }, '', homeURL);
}

const PendingSwap = ({ onClick }: { onClick: () => void }) => {
    const { source_network, destination_network } = useAtomicState()

    return <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        <motion.div
            onClick={onClick}
            initial="rest" whileHover="hover" animate="rest"
            className="relative bg-secondary-600 rounded-r-lg">
            <motion.div
                variants={textMotion}
                className="flex items-center bg-secondary-600 rounded-r-lg">
                <div className="text-primary-text flex px-3 p-2 items-center space-x-2">
                    <div className="flex-shrink-0 h-5 w-5 relative">
                        {source_network ?
                            <Image
                                src={source_network.logo}
                                alt="From Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                    <ChevronRight className="block h-4 w-4 mx-1" />
                    <div className="flex-shrink-0 h-5 w-5 relative block">
                        {destination_network ?
                            <Image
                                src={destination_network.logo}
                                alt="To Logo"
                                height="60"
                                width="60"
                                className="rounded-md object-contain"
                            /> : null
                        }
                    </div>
                </div>
            </motion.div>
        </motion.div>
    </motion.div>
}