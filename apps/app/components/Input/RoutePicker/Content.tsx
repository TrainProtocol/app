import { FC, useEffect, useMemo, useRef, useState } from "react";
import { NetworkElement, RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { useVirtualizer } from "@/lib/virtual";
import { Accordion } from "@/components/shadcn/accordion";
import Row from "./Rows";
import { Network, Token } from "@/Models/Network";
import RouteSearch from "./RouteSearch";
import NavigatableList from "@/components/NavigatableList";

type ContentProps = {
    onSelect: (network: Network, token: Token) => Promise<void> | void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    rowElements: RowElement[];
    selectedNetwork: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
}

export const Content: FC<ContentProps> = (props) => {
    const [isItemsScrolling, setIsItemsScrolling] = useState(false);

    const handleScroll = () => {
        setIsItemsScrolling(true);
    };

    return <>
        <RouteSearch
            searchQuery={props.searchQuery}
            setSearchQuery={props.setSearchQuery}
            shouldFocus={true}
            direction={props.direction}
        />
        <Items {...props} onScroll={handleScroll} setIsItemsScrolling={setIsItemsScrolling} />
    </>
}

type ItemsProps = ContentProps & {
    onScroll: () => void;
    setIsItemsScrolling: (isScrolling: boolean) => void;
}

const Items: FC<ItemsProps> = ({ searchQuery, setSearchQuery, rowElements, selectedToken, selectedNetwork, direction, onSelect, onScroll, setIsItemsScrolling }) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const [openValues, setOpenValues] = useState<string[]>(selectedNetwork ? [selectedNetwork] : [])
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const isSingleNetwork = useMemo(() => {
        if (!searchQuery) return false;
        return rowElements.filter(r => r.type === 'network').length === 1;
    }, [searchQuery, rowElements]);

    const onReset = useMemo(
        () => searchQuery ? (() => { }) : undefined,
        [searchQuery]
    );

    useEffect(() => {
        if (!isSingleNetwork) return;
        const network = rowElements.find(r => r.type === 'network') as NetworkElement;
        if (network) {
            setOpenValues(prev =>
                prev.includes(network.network.caip2Id) ? prev : [...prev, network.network.caip2Id]
            );
        }
    }, [isSingleNetwork, rowElements]);

    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        )
    }

    const virtualizer = useVirtualizer({
        count: rowElements.length,
        estimateSize: (index) => {
            const item = rowElements[index];
            const key = (item as any)?.network?.name || (item as any)?.symbol;
            const isOpen = openValues.includes(key);
            // Better size estimation based on open state
            if (isOpen && (item.type === 'network' || item.type === 'grouped_token')) {
                const tokenCount = item.type === 'network'
                    ? item.network.tokens.length
                    : item.items.length;
                // Base header (52) + tokens (each ~52px) + padding
                return 52 + (tokenCount * 52) + 20;
            }
            return 52;
        },
        getScrollElement: () => parentRef.current,
        overscan: 15
    })

    useEffect(() => {
        virtualizer.measure();
    }, [openValues])

    const items = virtualizer.getVirtualItems()

    useEffect(() => {
        return () => setSearchQuery('')
    }, [])

    const handleScrollEvent = () => {
        onScroll();
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsItemsScrolling(false);
        }, 150);
    };

    return (
        <div
            className="select-text overflow-y-auto overflow-x-hidden scrollbar:w-1! scrollbar:h-1! pr-0.5 styled-scroll h-full"
            ref={parentRef}
            onScroll={handleScrollEvent}
        >
            <NavigatableList enabled={true} onReset={onReset} navigateToFirstChild={isSingleNetwork}>
                <div id="sticky_accordion_header" />
                <div className="relative">
                    <Accordion type="multiple" value={openValues}>
                        <div>
                            <div
                                style={{
                                    height: virtualizer.getTotalSize(),
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${items[0]?.start ? (items[0]?.start - 0) : 0}px)`,
                                    }}>
                                    {items.map((virtualRow) => {
                                        const data = rowElements?.[virtualRow.index]
                                        const key = ((data as any)?.network as any)?.name || virtualRow.key;
                                        return <div
                                            className="py-1 box-border w-full overflow-hidden select-none"
                                            key={key}
                                            data-index={virtualRow.index}
                                            ref={virtualizer.measureElement}>
                                            <Row
                                                index={virtualRow.index}
                                                openValues={openValues}
                                                onSelect={onSelect}
                                                direction={direction}
                                                item={data}
                                                selectedNetwork={selectedNetwork}
                                                selectedToken={selectedToken}
                                                searchQuery={searchQuery}
                                                toggleContent={toggleAccordionItem}
                                                scrollContainerRef={parentRef}
                                            />
                                        </div>
                                    })}
                                </div>
                            </div>
                        </div>
                    </Accordion>
                </div>
            </NavigatableList>
        </div>
    )
}
