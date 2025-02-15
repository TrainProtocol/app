import { FC, ReactNode, SVGProps } from "react";

type AtomicCardProps = {
    icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
    title: ReactNode;
    titleDetails?: ReactNode;
    description: ReactNode;
}

const AtomicCard: FC<AtomicCardProps> = ({ description, icon: CardIcon, title, titleDetails }) => {
    return (
        <div className="bg-secondary-700 rounded-componentRoundness p-3 h-[101px] ">
            <div className="flex items-start space-x-3 w-full text-primary-text">
                <CardIcon className="w-5 sm:w-6 h-auto stroke-2" />
                <div className="w-full space-y-1">
                    <div className="flex w-full justify-between">
                        <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
                        {
                            titleDetails &&
                            <div className="text-sm text-secondary-text">{titleDetails}</div>
                        }
                    </div>
                    <div className="text-xs sm:text-sm font-normal text-secondary-text">{description}</div>
                </div>
            </div>
        </div>
    )
}

export default AtomicCard