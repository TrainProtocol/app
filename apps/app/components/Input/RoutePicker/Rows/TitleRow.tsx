import { TitleElement } from "@/apps/app/Models/Route";

type Props = {
    item: TitleElement
}

const TitleRow = ({ item }: Props) => {
    return (
        <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline bg-secondary-900 py-2">
            <p>{item.text}</p>
        </div>
    );
}

export default TitleRow;
