import { FC } from "react"
import { clsx } from 'clsx';
import SpinIcon from "../../../../Icons/spinIcon";
import { Ellipsis } from "lucide-react";

type Props = {
    isLoading?: boolean;
    isDisabled?: boolean;
    children?: React.ReactNode;
}

const ButtonStatus: FC<Props> = ({ isDisabled, isLoading, children }) => {
    return (
        <div
            className={clsx('min-h-[48px] items-center space-x-1 relative w-full flex justify-center font-semibold rounded-xl transition duration-200 ease-in-out bg-secondary-500 border border-secondary-500 text-primary-text py-3 px-2 md:px-3 cursor-progress', {
                'bg-opacity-90 cursor-not-allowed text-opacity-40': isDisabled,
            })}
        >
            {
                children ??
                <Ellipsis className="h-auto w-7 absolute left-1/2 right-1/2 -translate-x-1/2" />
            }
            {
                isLoading &&
                <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                    <SpinIcon className="animate-reverse-spin h-6 w-6" />
                </span>
            }
        </div>
    )
}

export default ButtonStatus