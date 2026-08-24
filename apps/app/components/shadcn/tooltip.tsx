"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, setTooltipDefaults } from "@layerswap/ui-kit"

// Applies to ui-kit's internal tooltips too (ExtendedAddress, WalletsList, CopyButton),
// which have no call site here to pass props at.
setTooltipDefaults({
  root: { delayDuration: 500 },
  content: {
    container: null,
    showArrow: true,
    className: "inline-flex w-fit max-w-xs items-center gap-1.5 border-0 bg-foreground text-background",
    arrowClasses: "bg-foreground fill-foreground",
  },
})

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
