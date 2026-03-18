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
                        <PopoverContent side="top" className="max-w-[300px] !border-0 !bg-secondary-600 p-3 space-y-1 !rounded-lg text-sm">
                            {children}
                        </PopoverContent>
                    </Popover>
                    :
                    <Tooltip delayDuration={150}>
                        <TooltipTrigger className="inline-flex" asChild>
                            {trigger}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px] !border-0 !bg-secondary-600 p-3 space-y-1 !rounded-lg text-sm">
                            {children}
                        </TooltipContent>
                    </Tooltip>
            }
        </>
    )
}

export default MobileTooltip;