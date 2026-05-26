import { useEffect } from "react";
import { useIntercom } from "react-use-intercom";
import SubmitButton from "./buttons/submitButton";
import TrainLogo from "./Icons/TrainLogo";

const TESTNET_URL = "https://testnet.train.tech";

function MaintananceContent() {
    const { boot, update } = useIntercom();

    useEffect(() => {
        boot();
        update();
    }, [boot, update]);

    return (
        <div className="flex items-center justify-center min-h-[80svh] px-4">
            <div className="flex flex-col items-center text-center max-w-md w-full space-y-8">
                <TrainLogo className="h-10 w-auto text-primary-logoColor fill-primary-text" />

                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-secondary-500 px-4 py-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500" />
                        </span>
                        <span className="text-sm font-medium text-secondary-text">Mainnet bridge unavailable</span>
                    </div>

                    <h1 className="text-3xl font-bold text-primary-text tracking-tight">
                        Try our testnet
                    </h1>
                    <p className="text-secondary-text text-base leading-relaxed">
                        The mainnet bridge is temporarily unavailable while we upgrade our systems. In the meantime, you can keep exploring Train Protocol on testnet.
                    </p>
                </div>

                <div className="w-full max-w-xs">
                    <SubmitButton
                        onClick={() => window.open(TESTNET_URL, "_blank", "noopener,noreferrer")}
                        isDisabled={false}
                        isSubmitting={false}
                    >
                        Open testnet bridge
                    </SubmitButton>
                </div>
            </div>
        </div>
    );
}

export default MaintananceContent;
