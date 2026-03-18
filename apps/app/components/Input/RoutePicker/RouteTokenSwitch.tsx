import { FC } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import clsx from "clsx";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import GlobeIcon from "@/components/Icons/GlobeIcon";
import TokenIcon from "@/components/Icons/TokenIcon";

const switchValues = [
    { value: false, id: 'network', label: "Group by Network", Icon: GlobeIcon },
    { value: true, id: 'token', label: "Group by Token", Icon: TokenIcon },
]

const RouteTokenSwitch: FC = () => {
    const showTokens = useRouteTokenSwitchStore((s) => s.showTokens)
    const setShowTokens = useRouteTokenSwitchStore((s) => s.setShowTokens)
    const activeTab = switchValues.find(item => item.value === showTokens)?.id || switchValues[0].id;

    return (
        <div className="flex justify-end">
            <div className="relative flex items-center bg-secondary-500 rounded-xl p-1">
                {switchValues.map((item, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger
                            type="button"
                            onClick={() => { setShowTokens(item.value); }}
                            className={clsx(
                                "z-10 flex items-center justify-center rounded-lg px-4 py-1 relative outline-hidden transition-colors duration-200",
                                activeTab === item.id ? "bg-secondary-400" : "bg-transparent"
                            )}
                        >
                            <item.Icon
                                className={clsx("h-5 w-5 transition-colors duration-200", {
                                    "text-primary-text": activeTab === item.id,
                                    "text-primary-text-tertiary": activeTab !== item.id,
                                })}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{item.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
};

export default RouteTokenSwitch;
