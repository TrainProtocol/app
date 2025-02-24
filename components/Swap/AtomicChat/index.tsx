import { FC } from "react";
import { Widget } from "../../Widget/Index";
import { Actions } from "./Actions";
import AtomicContent from "./AtomicContent";

type ContainerProps = {
    type: "widget" | "contained",
}

const Commitment: FC<ContainerProps> = ({ type }) => {
    return (
        <>
            <Widget.Content className="!py-0">
                <AtomicContent />
            </Widget.Content>
            <Widget.Footer sticky={true} >
                <Actions />
            </Widget.Footer>
        </>
    )
}

const Container: FC<ContainerProps> = (props) => {
    const { type } = props

    if (type === "widget")
        return <Widget className="!space-y-3">
            <Commitment {...props} />
        </Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-3 text-secondary-text">
            <Commitment {...props} />
        </div>

}

export default Container