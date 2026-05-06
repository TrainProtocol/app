import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="bg-secondary-700 md:shadow-md border-0 sm:border sm:border-border rounded-3xl w-full overflow-hidden min-h-[408px]">
            <div className="flex flex-col items-center justify-center gap-2 w-full min-h-93.5">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <span className="text-sm text-secondary-text">Loading swap data...</span>
            </div>
        </div>
    )
}
