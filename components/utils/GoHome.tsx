import { FC } from "react";
import LayerSwapLogo from "../Icons/TrainLogo";
import { useGoHome } from "../../hooks/useGoHome";
import { useRouter } from "next/router";

interface Props {
    className?: string;
    children?: JSX.Element | JSX.Element[] | string;
}

const GoHomeButton: FC<Props> = (({ className, children }) => {
    const goHome = useGoHome()
    const router = useRouter()

    const onClick = async () => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            await goHome()
            router.reload()
        } else {
            await goHome()
        }
    }

    return (
        <div onClick={onClick}>
            {
                children ??
                <LayerSwapLogo className={className ?? "h-8 w-auto text-primary-logoColor fill-primary-text"} />
            }
        </div>
    )
})

export default GoHomeButton;
