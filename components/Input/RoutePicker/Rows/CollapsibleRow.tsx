import { useMemo, memo, useRef, useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { NetworkElement, GroupedTokenElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/NetworkRoute";
import { CollapsableHeader } from "./CollapsableHeader";
import { CurrencySelectItemDisplay } from "../Routes";
import clsx from "clsx";
import { NavigatableItem } from "@/components/NavigatableList";
import { StickyHeader } from "./StickyHeader";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
};

type ChildWrapper = {
  token: NetworkRouteToken;
  route: NetworkRoute;
};

export const CollapsibleRow = ({
  item,
  index,
  toggleContent,
  direction,
  onSelect,
  selectedRoute,
  selectedToken,
  openValues,
  scrollContainerRef,
}: GenericAccordionRowProps & { index: number }) => {
  const groupName = item.type === "grouped_token" ? item.symbol : item.route.slug;
  const [isSticky, setSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const childrenList: ChildWrapper[] | undefined = useMemo(() => {
    if (item.type === "grouped_token") {
      const grouped = item as GroupedTokenElement;
      return grouped.items.map((el) => ({
        token: el.route.token,
        route: el.route.route,
      }));
    } else {
      const route = (item as NetworkElement).route;
      return route.tokens.map((t) => ({
        token: t,
        route: route as NetworkRoute,
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
              {childrenList?.map(({ token, route }, childIndex) => {
                const isSelected = selectedRoute === route.slug && selectedToken === token.symbol;

                return (
                  <NavigatableItem
                    key={`${groupName}-${childIndex}`}
                    index={childIndex}
                    parentIndex={index}
                    onClick={() => onSelect(route, token)}
                    focusedClassName="bg-secondary-400"
                    className="token-item pl-2 pr-3 cursor-pointer rounded-xl outline-none disabled:cursor-not-allowed hover:bg-secondary-400"
                  >
                    <TokenItem
                      token={token}
                      route={route}
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
  token: NetworkRouteToken;
  route: NetworkRoute;
  isSelected: boolean;
  direction: SwapDirection;
}>(({ token, route, isSelected, direction }) => {
  return (
    <CurrencySelectItemDisplay
      item={token}
      selected={isSelected}
      route={route}
      direction={direction}
      type="network_token"
    />
  );
});

TokenItem.displayName = 'TokenItem';
