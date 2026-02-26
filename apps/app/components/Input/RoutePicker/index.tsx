import { useFormikContext } from "formik";
import { FC, useCallback, useState } from "react";
import { SwapDirection, SwapFormValues } from "@/apps/app/components/DTOs/SwapFormValues";
import { Selector, SelectorContent, SelectorTrigger } from "@/apps/app/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "./Routes";
import useFormNetworks from "@/apps/app/hooks/useFormNetworks";
import { Content } from "./Content";
import { Network, Token } from "@/apps/app/Models/Network";
import clsx from "clsx";
import useWallet from "@/apps/app/hooks/useWallet";
import useSuggestionsLimit from "@/apps/app/hooks/useSuggestionsLimit";
import Balance from "@/apps/app/components/Input/Amount/Balance";

const RoutePicker: FC<{ direction: SwapDirection, className?: string }> = ({ direction, className }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const [searchQuery, setSearchQuery] = useState("")

    const { wallets } = useWallet()
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0, });

    const { isLoading, networkElements, selectedNetwork, selectedToken } = useFormNetworks({ direction, values }, searchQuery, suggestionsLimit)
    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const handleSelect = useCallback(async (network: Network, token: Token) => {
        // Set the token
        await setFieldValue(currencyFieldName, token, true);
        // Set the network
        await setFieldValue(direction, network, true);
    }, [currencyFieldName, direction, setFieldValue])

    return (
        <div className={clsx("flex flex-col self-end relative items-center", className)}>
            <Selector>
                <SelectorTrigger
                    data-attr={direction === "from" ? "from-route-picker" : "to-route-picker"}
                    disabled={false}
                    className="py-1.5 px-2 active:animate-press-down rounded-2xl bg-secondary-500"
                >
                    <SelectedRouteDisplay network={selectedNetwork} token={selectedToken} placeholder="Select token" />
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
                            rowElements={networkElements}
                            direction={direction}
                            selectedNetwork={selectedNetwork?.caip2Id}
                            selectedToken={selectedToken?.symbol}
                        />
                    )}
                </SelectorContent>
            </Selector>
            <Balance values={values} direction={direction} />
        </div>
    )
};

export default RoutePicker
