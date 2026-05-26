import { FC } from "react";
import TrainLogo from "../Icons/TrainLogo";
import { useGoHome } from "../../hooks/useGoHome";

interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[] | string;
    onClick?: () => void;
}

const GoHomeButton: FC<Props> = (({ className, children, onClick: onClickProp }) => {
    const goHome = useGoHome()

    const onClick = () => {
        onClickProp?.()
        goHome()
    }

    return (
        <div onClick={onClick}>
            {
                children ??
                <TrainLogo className={className ?? "h-8 w-auto text-primary-logoColor fill-primary-text"} />
            }
        </div>
    )
})

export default GoHomeButton;
