import { FC } from "react";
import TrainLogo from "../Icons/TrainLogo";
import { useGoHome } from "../../hooks/useGoHome";

interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[] | string;
}

const GoHomeButton: FC<Props> = (({ className, children }) => {
    const goHome = useGoHome()

    return (
        <div onClick={goHome}>
            {
                children ??
                <TrainLogo className={className ?? "h-8 w-auto text-primary-logoColor fill-primary-text"} />
            }
        </div>
    )
})

export default GoHomeButton;
