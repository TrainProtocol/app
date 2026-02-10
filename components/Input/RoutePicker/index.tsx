import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { SwapDirection, SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "./Routes";
import useFormRoutes from "@/hooks/useFormRoutes";
import { Content } from "./Content";
import { NetworkRoute, NetworkRouteToken } from "@/Models/NetworkRoute";
import clsx from "clsx";

const RoutePicker: FC<{ direction: SwapDirection, className?: string }> = ({ direction, className }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")

    const { isLoading, routeElements, selectedRoute, selectedToken } = useFormRoutes({ direction, values }, searchQuery, 4)
    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';

    const handleSelect = useCallback(async (route: NetworkRoute, token: NetworkRouteToken) => {
        // Set the token
        await setFieldValue(currencyFieldName, token, true);
        // Set the network
        await setFieldValue(direction, route, true);
    }, [currencyFieldName, direction, setFieldValue])

    return (
        <div className={clsx("flex flex-col self-end relative items-center", className)}>
            <Selector>
                <SelectorTrigger
                    data-attr={direction === "from" ? "from-route-picker" : "to-route-picker"}
                    disabled={false}
                    className="py-1.5 px-2 active:animate-press-down rounded-2xl bg-secondary-500"
                >
                    <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select token" />
                </SelectorTrigger>
                <SelectorContent
                    isLoading={isLoading}
                    searchHint="Search"
                >
                    {({ closeModal }) => (
                        <Content
                            onSelect={(r, t) => { handleSelect(r, t); closeModal(); }}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            rowElements={routeElements}
                            direction={direction}
                            selectedRoute={selectedRoute?.slug}
                            selectedToken={selectedToken?.symbol}
                        />
                    )}
                </SelectorContent>
            </Selector>
        </div>
    )
};

export default RoutePicker
