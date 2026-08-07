"use client";

import { clsx } from "clsx";
import { ImageWithFallback, WalletIcon } from "@layerswap/ui-kit/components";
import type { FC } from "react";
import AddressIcon from "@/components/AddressIcon";

type Props = {
    wallet: {
        icon?: string;
        address?: string;
        displayName?: string;
        id?: string;
    };
    className?: string;
    size?: number;
};

const WalletIconView: FC<Props> = ({ wallet, className, size = 24 }) => {
    if (wallet.icon) {
        return (
            <ImageWithFallback
                src={wallet.icon}
                alt={wallet.displayName ?? wallet.id ?? "wallet"}
                width={size}
                height={size}
                className={clsx("max-w-none object-contain", className)}
            />
        );
    }

    if (wallet.address) {
        return <AddressIcon address={wallet.address} size={size} className={className} />;
    }

    return <WalletIcon className={className} />;
};

export default WalletIconView;
