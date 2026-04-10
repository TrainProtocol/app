import { FC } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import GlobeIcon from "@/components/Icons/GlobeIcon";
import TokenIcon from "@/components/Icons/TokenIcon";

const RouteTokenSwitch: FC = () => {
    const showTokens = useRouteTokenSwitchStore((s) => s.showTokens)
    const setShowTokens = useRouteTokenSwitchStore((s) => s.setShowTokens)

    return (
        <Tabs value={showTokens ? "token" : "network"} onValueChange={(v) => setShowTokens(v === "token")}>
            <TabsList>
                <Tooltip>
                    <TabsTrigger value="network" asChild>
                        <TooltipTrigger type="button">
                            <GlobeIcon className="h-4 w-4" />
                        </TooltipTrigger>
                    </TabsTrigger>
                    <TooltipContent><p>Group by Network</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TabsTrigger value="token" asChild>
                        <TooltipTrigger type="button">
                            <TokenIcon className="h-4 w-4" />
                        </TooltipTrigger>
                    </TabsTrigger>
                    <TooltipContent><p>Group by Token</p></TooltipContent>
                </Tooltip>
            </TabsList>
        </Tabs>
    );
};

export default RouteTokenSwitch;
