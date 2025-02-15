import { FC } from "react";


const PendingButton: FC = () => {

    return <div
        className='flex justify-center w-full bg-secondary-700 p-[18px] rounded-componentRoundness'
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="8" viewBox="0 0 36 8" fill="none">
            <circle cx="4" cy="4" r="4" fill="#E6E6E6" fillOpacity="0.3" />
            <circle cx="18" cy="4" r="4" fill="#E6E6E6" fillOpacity="0.3" />
            <circle cx="32" cy="4" r="4" fill="#E6E6E6" fillOpacity="0.3" />
        </svg>
    </div >
}

export default PendingButton