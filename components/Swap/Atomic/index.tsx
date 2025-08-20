import { Formik, FormikProps } from "formik";
import { useCallback, useRef } from "react";
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
import WizardItem from "../../Wizard/WizardItem";
import Wizard from "../../Wizard/Wizard";
import { AtomicSteps } from "../../../Models/Wizard";
import { useFormWizardaUpdate, useFormWizardState } from "../../../context/formWizardProvider";
import { generateSwapInitialValues } from "../../../lib/generateSwapInitialValues";
import { useSettingsState } from "../../../context/settings";
import { resolvePersistantQueryParams } from "../../../helpers/querryHelper";
import toast from "react-hot-toast";

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
    const { goToStep } = useFormWizardaUpdate()
    const { currentStepName } = useFormWizardState()
    const query = useQueryState()

    const { updatePolling: pollFee, fee } = useFee()
    const { getProvider } = useWallet()
    const { atomicQuery, setAtomicQuery } = useAtomicState()
    const settings = useSettingsState()

    const {
        commitId
    } = atomicQuery;

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
            const destination_provider = values.to && getProvider(values.to, 'withdrawal')

            if (!source_provider) {
                throw new Error("No source_provider")
            }
            if (!destination_provider) {
                throw new Error("No destination_provider")
            }

            const atomicValues = {
                amount: values.amount,
                address: values.destination_address,
                source: values.from?.name!,
                destination: values.to?.name!,
                source_asset: values.fromCurrency.symbol,
                destination_asset: values.toCurrency.symbol,
                solver: fee?.quote?.solverName,
                srcContract: fee?.quote?.sourceContractAddress,
                destContract: fee?.quote?.destinationContractAddress,
            }

            setAtomicQuery(atomicValues)
            setAtomicPath({
                atomicQuery: atomicValues,
                router
            })
            goToStep(AtomicSteps.Swap)
        }
        catch (error) {
            console.log(error)
            toast.error(error)
        }
    }, [query, router, getProvider])

    const initialValues: SwapFormValues = generateSwapInitialValues(settings, query)

    // useEffect(() => {
    //     formikRef.current?.validateForm();
    // }, [minAllowedAmount, maxAllowedAmount]);

    const handleWizardRouting = useCallback((step: AtomicSteps, move?: 'back' | 'forward') => {
        pollFee(move === 'back')
        goToStep(step, move)
        move == 'forward' ? (atomicQuery.source && setAtomicPath({ atomicQuery, router })) : removeSwapPath(router)
    }, [atomicQuery, router])

    return <>
        <AnimatePresence mode='wait'>
            {
                commitId &&
                currentStepName !== AtomicSteps.Swap &&
                <div className="cursor-pointer absolute z-10 mt-4 ml-6">
                    <PendingSwap key="pendingSwap" onClick={() => handleWizardRouting(AtomicSteps.Swap, 'forward')} />
                </div>
            }
        </AnimatePresence>

        <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validateOnMount={true}
            validate={MainStepValidation()}
            onSubmit={handleSubmit}
        >
            <Wizard wizardId={"atomicSteps"}>
                <WizardItem StepName={AtomicSteps.Form}>
                    <div className="flex flex-col justify-between h-full">
                        <SwapForm />
                    </div>
                </WizardItem>
                <WizardItem StepName={AtomicSteps.Swap} GoBack={() => handleWizardRouting(AtomicSteps.Form, 'back')}>
                    <AtomicPage type='contained' />
                </WizardItem>
            </Wizard>
        </Formik>
    </>
}

const setAtomicPath = ({
    atomicQuery,
    router
}: {
    atomicQuery: any
    router: NextRouter
}) => {
    const basePath = router?.basePath || ""
    var atomicURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/swap`;
    const params = resolvePersistantQueryParams(router.query)
    const atomicParams = new URLSearchParams({ ...atomicQuery })
    if (atomicParams) {
        atomicURL += `?${atomicParams}`
        if (params && Object.keys(params).length) {
            const search = new URLSearchParams(params as any);
            if (search)
                atomicURL += `&${search}`
        }
    }
    window.history.pushState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);
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

const PendingSwap = ({ onClick }: { onClick: () => void }) => {
    const { source_network, destination_network } = useAtomicState()

    return <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
    >
        <div
            onClick={onClick}
            className="relative bg-secondary-600 rounded-lg hover:bg-secondary-500 transition-colors">
            <div
                className="flex items-center">
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
            </div>
        </div>
    </motion.div>
}
