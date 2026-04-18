import { Widget } from "@/components/Widget/Index"
import SwapHistory from "./index"

export default function TransactionsView() {
    return (
        <Widget hideMenu>
            <div className="openpicker pt-4">
                <SwapHistory />
            </div>
        </Widget>
    )
}
