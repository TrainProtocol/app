import { Loader } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex items-center justify-center w-full min-h-[80svh]">
            <Loader className="h-10 w-10 text-primary-text animate-spin" />
        </div>
    )
}
