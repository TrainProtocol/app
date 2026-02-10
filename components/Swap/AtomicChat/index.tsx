import { FC, useMemo } from "react";
import { Widget } from "../../Widget/Index";
import { Actions } from "./Actions";
import AtomicContent from "./AtomicContent";
import { useSecretDerivation } from "../../../context/secretDerivationContext";
import { useAtomicState } from "../../../context/atomicContext";
import { buildQuoteParamsFromAtomic, useQuoteData } from "../../../hooks/useFee";

type ContainerProps = {
    type: "widget" | "contained",
}

const Commitment: FC<ContainerProps> = ({ type }) => {
    const { isLoggedIn } = useSecretDerivation();
    const { source_network, destination_network, source_asset, destination_asset, amount, atomicQuery } = useAtomicState();
    const commitId = atomicQuery?.commitId;

    const quoteParams = useMemo(() => {
        if (commitId) return undefined;
        return buildQuoteParamsFromAtomic({
            from: source_network?.slug,
            to: destination_network?.slug,
            fromCurrency: source_asset,
            toCurrency: destination_asset,
            amount: amount != null ? String(amount) : undefined,
        });
    }, [commitId, source_network?.slug, destination_network?.slug, source_asset, destination_asset, amount]);

    const { quote, isQuoteLoading } = useQuoteData(quoteParams, 42000);

    // Early return for safety (login already validated by FormButton)
    if (!isLoggedIn) {
        return null;
    }

    return (
        <>
            <Widget.Content>
                <AtomicContent quote={quote} isQuoteLoading={isQuoteLoading} />
            </Widget.Content>
            <Widget.Footer sticky={true} >
                <Actions quote={quote} isQuoteLoading={isQuoteLoading} />
            </Widget.Footer>
        </>
    )
}

const Container: FC<ContainerProps> = (props) => {
    const { type } = props

    if (type === "widget")
        return <Widget className="!space-y-3">
            <Commitment {...props} />
        </Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-3 text-secondary-text">
            <Commitment {...props} />
        </div>

}

export default Container