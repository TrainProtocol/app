import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { NetworkElement, GroupedTokenElement } from "@/Models/Route";
import { NetworkRouteSelectItemDisplay } from "../Routes";

type Props = {
    item: NetworkElement | GroupedTokenElement;
    direction: SwapDirection;
    hideTokenImages?: boolean;
}

export const CollapsableHeader = ({ item, direction, hideTokenImages }: Props) => {
    if (item.type === "network") {
        return (
            <NetworkRouteSelectItemDisplay
                item={item.route}
                selected={false}
                direction={direction}
            />
        );
    }

    // grouped_token case - simplified for now
    const mainToken = item.items[0]?.route.token;
    if (!mainToken) return null;

    return (
        <div className="flex items-center gap-3 p-2">
            <div className="shrink-0 h-9 w-9 relative">
                <img
                    src={mainToken.logo || `https://raw.githubusercontent.com/TrainProtocol/icons/main/tokens/${mainToken.symbol.toLowerCase()}.png`}
                    alt={`${mainToken.symbol} logo`}
                    className="rounded-full object-contain"
                />
            </div>
            <div className="flex-1">
                <span className="font-medium">{mainToken.symbol}</span>
            </div>
        </div>
    );
};
