import { ResolveConnectorIcon as BaseResolveConnectorIcon } from "@layerswap/ui-kit";
import { cn } from "@layerswap/utils";
import { NetworkTypes } from "@/Models/Network";
import Azguard from "./Wallets/Azguard";

type Props = {
    connector?: string;
    iconClassName: string;
    className?: string;
}

export const ResolveConnectorIcon = ({ connector, iconClassName, className }: Props) => {
    if (connector?.toLowerCase() === NetworkTypes.Aztec) {
        return (
            <div className="min-w-fit">
                <Azguard className={cn(iconClassName, "size-[5.25rem]")} />
            </div>
        );
    }

    return <BaseResolveConnectorIcon connector={connector} iconClassName={iconClassName} className={className} />;
};
