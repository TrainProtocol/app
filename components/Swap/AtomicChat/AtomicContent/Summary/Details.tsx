import { FC, ReactNode, SVGProps } from "react";
import WalletIcon from "../../../../Icons/WalletIcon";
import LockIcon from "../../../../Icons/LockIcon";
import SignatureIcon from "../../../../Icons/SignatureIcon";

const Details: FC = () => {
    return (
        <div className="flex flex-col space-y-4">
            <Confirmed />
            <AssetsReady />
            <SignAndConfirm />
        </div>
    )
}

const Confirmed: FC = () => {
    return (
        <Item
            icon={WalletIcon}
            title="Confirmed"
            description="Your transaction has been confirmed"
        />
    )
}

const AssetsReady: FC = () => {
    return (
        <Item
            icon={LockIcon}
            title="Assets Ready"
            description="Your assets are ready to be claimed"
        />
    )
}

const SignAndConfirm: FC = () => {
    return (
        <Item
            icon={SignatureIcon}
            title="Signed & Confirmed"
            description="Sign and finalize the swap, you can cancel and refund anytime before."
        />
    )
}

const Item: FC<{
    icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
    title: ReactNode;
    titleDetails?: ReactNode;
    description: ReactNode;
}> = ({ description, icon: CardIcon, title, titleDetails }) => {
    return (
        <div className="flex items-start space-x-4 w-full text-primary-text">
            <CardIcon className="w-5 sm:w-6 h-auto stroke-2" />
            <div className="w-full space-y-1">
                <div className="flex w-full justify-between">
                    <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
                    {
                        titleDetails &&
                        <div className="text-sm text-secondary-text">{titleDetails}</div>
                    }
                </div>
                <div className="text-xs sm:text-sm font-normal text-primary-text-placeholder">{description}</div>
            </div>
        </div>
    )
}

export default Details;