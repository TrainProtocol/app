import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { NetworkElement, GroupedTokenElement } from "@/Models/Route";
import { NetworkRouteSelectItemDisplay, GroupedTokenHeader } from "../Routes";

type Props = {
    item: NetworkElement | GroupedTokenElement;
    direction: SwapDirection;
    hideTokenImages?: boolean;
}

export const CollapsableHeader = ({ item, direction, hideTokenImages }: Props) => {
    if (item.type === "network") {
        return (
            <NetworkRouteSelectItemDisplay
                item={item.network}
                selected={false}
                direction={direction}
            />
        );
    }

    return (
        <GroupedTokenHeader
            item={item as GroupedTokenElement}
            direction={direction}
            hideTokenImages={hideTokenImages}
        />
    );
};
