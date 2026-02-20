import { FC, useMemo } from "react";
import { SearchComponent } from "../Search";
import { useSettingsState } from "@/context/settings";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";

type RouteSearchProps = {
    searchQuery: string,
    setSearchQuery: (query: string) => void,
    shouldFocus: boolean,
    direction: SwapDirection;
}

const RouteSearch: FC<RouteSearchProps> = ({ searchQuery, setSearchQuery, shouldFocus, direction }) => {
    const { networks } = useSettingsState();

    const animatedPlaceholders = useMemo(() => {
        const shuffled = [...networks].sort(() => Math.random() - 0.5);

        const routeTexts = shuffled
            .filter((network) => network.tokens?.length)
            .map((network) => {
                const token = network.tokens[Math.floor(Math.random() * network.tokens.length)];
                return `Try "${token.symbol} ${network.displayName || network.caip2Id}"`;
            });
        return ["Search by token and network", ...routeTexts];
    }, [networks])

    return <div>
        <SearchComponent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isOpen={shouldFocus}
            animatedPlaceholders={animatedPlaceholders}
        />
    </div>
}

export default RouteSearch
