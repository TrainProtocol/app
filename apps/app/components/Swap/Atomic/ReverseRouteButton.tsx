import { FC, useCallback, useMemo } from "react";
import { useFormikContext } from "formik";
import { motion, useCycle } from "framer-motion";
import { ArrowUpDown } from "lucide-react";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";

const ReverseRouteButton: FC = () => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const query = useQueryState();
    const { networks } = useSettingsState();

    const [animate, cycle] = useCycle(
        { rotateX: 0 },
        { rotateX: 180 }
    );

    const { from: source, to: destination, fromCurrency, toCurrency } = values;

    const disabled = useMemo(() => {
        if (query?.lockFrom || query?.lockTo || query?.hideFrom || query?.hideTo) {
            return true;
        }
        if (!source && !destination) {
            return true;
        }

        const sourceCanBeDestination = !source || networks.some(n =>
            n.caip2Id === source.caip2Id && n.tokens.some(t => t.symbol === fromCurrency?.symbol)
        );
        const destinationCanBeSource = !destination || networks.some(n =>
            n.caip2Id === destination.caip2Id && n.tokens.some(t => t.symbol === toCurrency?.symbol)
        );

        return !sourceCanBeDestination || !destinationCanBeSource;
    }, [query, source, destination, fromCurrency, toCurrency, networks]);

    const handleReverse = useCallback(async () => {
        const newFrom = networks.find(n => n.caip2Id === destination?.caip2Id);
        const newFromToken = newFrom?.tokens.find(t => t.symbol === toCurrency?.symbol);
        const newTo = networks.find(n => n.caip2Id === source?.caip2Id);
        const newToToken = newTo?.tokens.find(t => t.symbol === fromCurrency?.symbol);

        await setFieldValue('from', newFrom);
        await setFieldValue('fromCurrency', newFromToken);
        await setFieldValue('to', newTo);
        await setFieldValue('toCurrency', newToToken);
    }, [source, destination, fromCurrency, toCurrency, networks, setFieldValue]);

    return (
        <button
            type="button"
            aria-label="Reverse the source and destination"
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={() => { cycle(); handleReverse(); }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-lg hover:text-primary-text text-secondary-text disabled:cursor-not-allowed disabled:text-secondary-text disabled:pointer-events-none duration-200 transition"
        >
            <motion.div
                animate={animate}
                transition={{ duration: 0.3 }}
                style={{ pointerEvents: 'none' }}
            >
                <ArrowUpDown className={`w-7 h-auto p-1 bg-secondary-400 hover:bg-secondary-300 rounded-lg ${disabled ? 'opacity-50' : ''}`} />
            </motion.div>
        </button>
    );
};

export default ReverseRouteButton;
