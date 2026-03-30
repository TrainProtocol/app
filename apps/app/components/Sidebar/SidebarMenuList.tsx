import { FC } from "react"
import MenuList from "@/components/TrainMenu/MenuList"
import { MenuStep } from "@/Models/Wizard"

const SidebarMenuList: FC<{ goToStep: (step: MenuStep) => void; onViewSwap?: (hashlock: string) => void }> = ({ goToStep, onViewSwap }) => {
    return <div className="h-full">
        <MenuList goToStep={goToStep} />
    </div>
}

export default SidebarMenuList
