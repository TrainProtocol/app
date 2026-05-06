export default function Loading() {
    return (
        <div className="relative w-full">
            <div className="bg-secondary-700 md:shadow-md border-0 sm:border sm:border-border rounded-3xl w-full overflow-hidden min-h-[408px]">
                <div className="px-4 pt-4 pb-4 space-y-3 animate-pulse">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-secondary-500 rounded-3xl h-20" />
                    ))}
                </div>
            </div>
        </div>
    )
}
