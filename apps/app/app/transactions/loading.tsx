import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex items-center justify-center w-full min-h-93.5">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
    )
}
