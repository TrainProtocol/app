import { FC } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import useWindowDimensions from "../../hooks/useWindowDimensions";

type MobileTooltipProps = {
    trigger?: React.ReactNode;
    children?: React.ReactNode;
}

const MobileTooltip: FC<MobileTooltipProps> = ({ children, trigger }) => {
    const { isMobile } = useWindowDimensions();

    return (
        <>
            {
                isMobile ?
                    <Popover>
                        <PopoverTrigger asChild>
                            {trigger}
                        </PopoverTrigger>
                        <PopoverContent
                            side="top"
                            className="inline-flex w-fit max-w-xs items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs text-background shadow-none ring-0 flex-row"
                        >
                            {children}
                        </PopoverContent>
                    </Popover>
                    :
                    <Tooltip delayDuration={150}>
                        <TooltipTrigger className="inline-flex" asChild>
                            {trigger}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px] text-sm">
                            {children}
                        </TooltipContent>
                    </Tooltip>
            }
        </>
    )
}

export default MobileTooltip;