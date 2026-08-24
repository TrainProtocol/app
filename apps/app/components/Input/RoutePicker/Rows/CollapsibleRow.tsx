import { useMemo, memo, useRef, useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@layerswap/ui-kit";
import { NetworkElement, GroupedTokenElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { ExtendedNetwork, ExtendedToken } from "@/Models/Network";
import { CollapsableHeader } from "./CollapsableHeader";
import { CurrencySelectItemDisplay } from "../Routes";
import clsx from "clsx";
import { NavigatableItem } from "@/components/NavigatableList";
import { StickyHeader } from "./StickyHeader";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (network: ExtendedNetwork, token: ExtendedToken) => void;
  selectedNetwork: string | undefined;
  selectedToken: string | undefined;
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

type ChildWrapper = {
  token: ExtendedToken;
  network: ExtendedNetwork;
};

export const CollapsibleRow = ({
  item,
  index,
  toggleContent,
  direction,
  onSelect,
  selectedNetwork,
  selectedToken,
  openValues,
  scrollContainerRef,
}: GenericAccordionRowProps & { index: number }) => {
  const groupName = item.type === "grouped_token" ? item.symbol : item.network.caip2Id;
  const [isSticky, setSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const childrenList: ChildWrapper[] | undefined = useMemo(() => {
    if (item.type === "grouped_token") {
      const grouped = item as GroupedTokenElement;
      return grouped.items.map((el) => ({
        token: el.data.token,
        network: el.data.network,
      }));
    } else {
      const network = (item as NetworkElement).network;
      return network.tokens.map((t) => ({
        token: t,
        network: network,
      }));
    }
  }, [item])

  const isOpen = openValues?.some((ov) => ov === groupName);

  return (
    <div>
      <AccordionItem value={groupName}>
        <NavigatableItem
          index={index}
          onClick={() => toggleContent(groupName)}
          focusedClassName="bg-secondary-500 is-focused"
          className={clsx(
            "cursor-pointer rounded-lg relative group/accordion hover:bg-secondary-500",
            isSticky && "opacity-0"
          )}
          ref={headerRef}
        >
          <AccordionTrigger tabIndex={-1}>
            <CollapsableHeader
              item={item}
              direction={direction}
              hideTokenImages={isOpen}
            />
          </AccordionTrigger>
        </NavigatableItem>

        <StickyHeader
          item={item}
          direction={direction}
          scrollContainer={scrollContainerRef?.current || null}
          open={isOpen}
          headerRef={headerRef}
          contentRef={contentRef}
          childrenCount={childrenList?.length}
          onClick={() => toggleContent(groupName)}
          isSticky={isSticky}
          setSticky={setSticky}
        />

        <AccordionContent className="AccordionContent" ref={contentRef}>
          <div className="has-[.token-item]:mt-1 bg-secondary-500 rounded-xl overflow-hidden">
            <div className="overflow-y-auto styled-scroll p-2">
              {childrenList?.map(({ token, network }, childIndex) => {
                const isSelected = selectedNetwork === network.caip2Id && selectedToken === token.symbol;

                return (
                  <NavigatableItem
                    key={`${groupName}-${childIndex}`}
                    index={childIndex}
                    parentIndex={index}
                    onClick={() => onSelect(network, token)}
                    focusedClassName="bg-secondary-400"
                    className="token-item pl-2 pr-3 cursor-pointer rounded-xl outline-none disabled:cursor-not-allowed hover:bg-secondary-400"
                  >
                    <TokenItem
                      token={token}
                      network={network}
                      isSelected={isSelected}
                      direction={direction}
                    />
                  </NavigatableItem>
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

// Memoized child item to prevent re-renders
const TokenItem = memo<{
  token: ExtendedToken;
  network: ExtendedNetwork;
  isSelected: boolean;
  direction: SwapDirection;
}>(({ token, network, isSelected, direction }) => {
  return (
    <CurrencySelectItemDisplay
      item={token}
      selected={isSelected}
      network={network}
      direction={direction}
      type="network_token"
    />
  );
});

TokenItem.displayName = 'TokenItem';
