export default function Loading() {
    return (
        <div className="max-md:px-4">
            <div className="flex flex-col gap-3 animate-pulse">
                <div className="bg-secondary-700 border border-border rounded-3xl h-[88px]" />
                <div className="bg-secondary-700 border border-border rounded-3xl h-[164px]" />
            </div>
        </div>
    )
}
