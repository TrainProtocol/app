import { RowElement } from "@/apps/app/Models/Route";
import { SwapDirection } from "@/apps/app/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { Network, Token } from "@/apps/app/Models/Network";
import { SelectItem } from "@/apps/app/components/Select/Selector/SelectItem";
import TitleRow from "./TitleRow";
import { NavigatableItem } from "@/apps/app/components/NavigatableList";

type Props = {
    item: RowElement;
    selectedNetwork: string | undefined;
    selectedToken: string | undefined;
    searchQuery: string
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (network: Network, token: Token) => void;
    openValues: string[];
    index: number;
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
};

export default function Row({
    item,
    direction,
    selectedNetwork,
    selectedToken,
    toggleContent,
    onSelect,
    openValues,
    index,
    scrollContainerRef,
}: Props) {

    switch (item.type) {
        case "network":
        case "grouped_token": {
            return (
                <CollapsibleRow
                    index={index}
                    item={item}
                    direction={direction}
                    selectedNetwork={selectedNetwork}
                    selectedToken={selectedToken}
                    toggleContent={toggleContent}
                    onSelect={onSelect}
                    openValues={openValues}
                    scrollContainerRef={scrollContainerRef}
                />
            );
        }
        case "network_token":
        case "suggested_token": {
            const token = item.data.token;
            const network = item.data.network;
            const isSelected = selectedNetwork === network.caip2Id && selectedToken === token.symbol;

            return (
                <NavigatableItem
                    index={index}
                    onClick={() => onSelect(network, token)}
                    focusedClassName="bg-secondary-500"
                    className="cursor-pointer outline-none disabled:cursor-not-allowed rounded-xl hover:bg-secondary-500"
                >
                    <CurrencySelectItemDisplay
                        item={token}
                        selected={isSelected}
                        network={network}
                        direction={direction}
                        type={item.type}
                    />
                </NavigatableItem>
            );
        }
        case "group_title":
            return <TitleRow item={item} />
        case "skeleton_token":
            return (
                <SelectItem className="animate-pulse">
                    <SelectItem.Logo
                        altText="skeleton logo"
                        className="rounded-full bg-secondary-500"
                    />
                    <SelectItem.Title className="py-0.5">
                        <div className="grid gap-0 leading-5 align-middle space-y-0.5 font-medium">
                            <span className="align-middle h-3.5 my-1 w-12 bg-secondary-500 rounded-sm" />
                            <div className="flex items-center space-x-1 align-middle" >
                                <div className="w-2 h-2 my-1 bg-secondary-500 rounded-sm" />
                                <span className="bg-secondary-500 text-xs whitespace-nowrap h-2 my-1 w-20 rounded-sm" />
                            </div>
                        </div>
                        <span className="text-sm text-secondary-text text-right my-auto leading-4 font-medium">
                            <div className="text-primary-text text-lg leading-[22px] bg-secondary-500 h-3 my-1 w-16 ml-auto rounded-sm" />
                            <div className="text-xs leading-4 bg-secondary-500 h-2 my-1 w-10 ml-auto rounded-sm" />
                        </span>
                    </SelectItem.Title>
                </SelectItem >
            );
        default:
            return null
    }
}
