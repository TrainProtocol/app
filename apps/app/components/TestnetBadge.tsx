import AppSettings from "@/lib/AppSettings"

const TestnetBadge = () => {
    if (AppSettings.ApiVersion !== 'sandbox') return null
    return (
        <div className="relative z-20">
            <div className="absolute -top-1 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                TESTNET
            </div>
        </div>
    )
}

export default TestnetBadge
