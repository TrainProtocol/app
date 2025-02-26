import { FC, useEffect } from "react";
import { usePulsatingCircles } from "../../../../../context/PulsatingCirclesContext";
import CheckedIcon from "../../../../Icons/CheckedIcon";

type StepProps = {
    step: number;
    title: string;
    description: JSX.Element | string;
    active: boolean;
    completed?: boolean
    loading?: boolean
}
const Step: FC<StepProps> = ({ step, title, description, active, completed, loading }) => {
    const { setIsActive } = usePulsatingCircles();

    useEffect(() => {
        setIsActive(!!loading);
    }, [loading, setIsActive]);

    return <div className={`inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 ${!active ? 'opacity-60' : ''}`}>
        <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
                <div className="flex w-fit items-center justify-center h-[19px]">
                    <div
                        className="relative z-10 flex w-full items-center overflow-hidden rounded-full p-0.5"
                    >
                        {
                            loading &&
                            <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(theme(colors.accent.DEFAULT)_120deg,transparent_120deg)]" />
                        }
                        {
                            !completed &&
                            <div className={'py-0.5 px-2.5 bg-secondary-400 z-20 rounded-full relative text-[10px] transition-all inline-flex items-center gap-1'} >
                                Step {step}
                            </div>
                        }
                        {
                            completed &&
                            <CheckedIcon className="h-5 w-5 text-accent" />
                        }
                    </div>
                </div>
                <div className="text-primary-text text-base leading-5">{title}</div>
            </div>
            <div className="text-sm text-primary-text-placeholder">{description}</div>
        </div>
    </div>
}

export default Step;