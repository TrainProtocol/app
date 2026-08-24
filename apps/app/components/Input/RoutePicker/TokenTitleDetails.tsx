import { ExtendedNetwork, ExtendedToken } from "@/Models/Network";
import { Info } from "lucide-react";
import { ExtendedAddress } from "../Address/AddressPicker/AddressWithIcon";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { ImageWithFallback } from "@layerswap/ui-kit";
import { resolveTokenLogoUrl } from "@/components/utils/resolveTokenLogoUrl";

type TokenInfoIconProps = {
    item: ExtendedToken;
    network: ExtendedNetwork;
    className?: string;
}

export const TokenInfoIcon = ({ item, network, className }: TokenInfoIconProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    return (
        <div className={className} data-popover-open={isPopoverOpen} data-tooltip-open={isTooltipOpen}>
            {item.contract ? (
                <ExtendedAddress
                    network={network}
                    isForCurrency
                    showDetails
                    address={item.contract}
                    logo={item.logoUrl || resolveTokenLogoUrl(item.symbol)}
                    title={item.symbol}
                    onPopoverOpenChange={setIsPopoverOpen}
                    onTooltipOpenChange={setIsTooltipOpen}
                >
                    <TokenInfoTrigger item={item} isPopoverOpen={isPopoverOpen} isTooltipOpen={isTooltipOpen} />
                </ExtendedAddress>
            ) : (
                <NativeTokenTitle
                    item={item}
                    network={network}
                    isPopoverOpen={isPopoverOpen}
                    isTooltipOpen={isTooltipOpen}
                    onPopoverOpenChange={setIsPopoverOpen}
                    onTooltipOpenChange={setIsTooltipOpen}
                />
            )}
        </div>
    );
};

type TokenInfoTriggerProps = {
    item: ExtendedToken;
    isPopoverOpen?: boolean;
    isTooltipOpen?: boolean;
}

const TokenInfoTrigger = ({ item, isPopoverOpen, isTooltipOpen }: TokenInfoTriggerProps) => {
    return (
        <span className="flex items-center gap-1 text-secondary-text cursor-pointer hover:text-primary-text data-[popover-open=true] data-[tooltip-open=true] text-xs pr-2" data-popover-open={isPopoverOpen} data-tooltip-open={isTooltipOpen}>
            <p className="truncate min-w-0">
                <span>•</span> <span>{item.symbol}</span>
            </p>
            <Info className="h-3 w-3 shrink-0" />
        </span>
    )
}

type NativeTokenTitleProps = {
    item: ExtendedToken;
    network: ExtendedNetwork;
    onTooltipOpenChange?: (open: boolean) => void;
    onPopoverOpenChange?: (open: boolean) => void;
    isPopoverOpen?: boolean;
    isTooltipOpen?: boolean;
}

const NativeTokenTitle = ({ item, network, onTooltipOpenChange, onPopoverOpenChange, isPopoverOpen, isTooltipOpen }: NativeTokenTitleProps) => {
    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover open={isPopoverOpen} onOpenChange={onPopoverOpenChange} modal={true}>
                <PopoverTrigger asChild>
                    <div>
                        <Tooltip onOpenChange={onTooltipOpenChange}>
                            <TooltipTrigger asChild>
                                <span>
                                    <TokenInfoTrigger
                                        item={item}
                                        isPopoverOpen={isPopoverOpen}
                                        isTooltipOpen={isTooltipOpen}
                                    />
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="pointer-events-none">
                                <p>View token details</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-3 min-w-72 flex flex-col gap-3 items-stretch rounded-2xl! bg-secondary-500!"
                    side="top"
                    avoidCollisions={true}
                    collisionPadding={8}
                    sticky="always"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <ImageWithFallback
                                src={item.logoUrl || resolveTokenLogoUrl(item.symbol)}
                                alt={item.symbol}
                                height="40"
                                width="40"
                                loading="eager"
                                fetchPriority="high"
                                className="rounded-full object-contain shrink-0 h-10 w-10"
                            />
                            <div className="flex-1 font-medium">
                                <h3 className="text-base leading-5 text-primary-text">{item.symbol}</h3>
                            </div>
                        </div>
                        <hr className="border rounded-full border-secondary-400 mt-2" />
                    </div>

                    <p className="text-secondary-text text-sm leading-5 break-all text-left font-mono">
                        {network.displayName} <span>{item.symbol}</span>{' native coin'}
                    </p>
                </PopoverContent>
            </Popover>
        </div>
    );
};
