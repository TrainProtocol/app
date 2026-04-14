import RoutePicker from "./RoutePicker";
import Address from "./Address";
import DestinationWalletPicker from "./DestinationWalletPicker";
import AmountField from "./AmountField";

type Props = {
    isQuoteLoading?: boolean;
}

const DestinationPicker = ({ isQuoteLoading }: Props) => {
    return (
        <div className="flex flex-col w-full bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px]">
            <div className="grid grid-cols-9 gap-2 items-center h-7">
                <label htmlFor="To" className="block col-span-4 font-normal text-secondary-text text-base leading-5">
                    Receive at
                </label>
                <div className="col-span-5 justify-self-end">
                    <Address>
                        {({ destination, addressItem, connectedWallet, partner }) =>
                            <DestinationWalletPicker destination={destination} addressItem={addressItem} connectedWallet={connectedWallet} />}
                    </Address>
                </div>
            </div>
            <div className="items-center space-y-2">
                <div className="grid grid-cols-[1fr_auto] gap-1 w-full max-w-full">
                    <div className="min-w-0 overflow-hidden">
                        <AmountField side="destination" isQuoteLoading={isQuoteLoading} />
                    </div>
                    <div className="justify-self-end self-start">
                        <RoutePicker direction="to" />
                    </div>
                </div>
            </div>
        </div>
    )
};

export default DestinationPicker
