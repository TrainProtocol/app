import { FC } from "react"

type AddressButtonProps = {
    openAddressModal: () => void;
    disabled: boolean;
    children: JSX.Element | JSX.Element[];
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, disabled, children }) => {
    return <button type="button" className="w-full" disabled={disabled} onClick={openAddressModal} >
        {
            children
        }
    </button>
}

export default AddressButton