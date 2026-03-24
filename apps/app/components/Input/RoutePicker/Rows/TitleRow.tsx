import { TitleElement } from "@/Models/Route";
import { useBalanceStore } from "@/stores/balanceStore";
import RouteSortingMenu from "../RouteSortingMenu";
import RouteTokenSwitch from "../RouteTokenSwitch";

type Props = {
    item: TitleElement
}

const TitleRow = ({ item }: Props) => {
    const isLoadingBalances = useBalanceStore(s => s.sortingDataIsLoading);

    if (item.text.toLowerCase().includes("suggestions")) {
        if (isLoadingBalances) {
            return (
                <div className="text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline text-transparent bg-[linear-gradient(120deg,var(--color-primary-text-tertiary)_40%,var(--color-primary-text),var(--color-primary-text-tertiary)_60%)] bg-[size:200%_100%] bg-clip-text animate-shine">
                    Suggestions
                </div>
            );
        }
        return (
            <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline bg-secondary-700">
                Suggestions
            </div>
        );
    }

    return (
        <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline bg-secondary-700">
            <div className="flex items-center gap-1">
                <p>{item.text}</p>
                {item.text.toLowerCase().includes("all") && <RouteSortingMenu />}
            </div>
            {item.text.toLowerCase().includes("all") && (
                <div className="relative ml-auto flex items-center gap-2">
                    <RouteTokenSwitch />
                </div>
            )}
        </div>
    );
}

export default TitleRow;
