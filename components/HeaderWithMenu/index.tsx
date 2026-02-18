import IconButton from "@/components/buttons/iconButton"
import GoHomeButton from "@/components/utils/GoHome"
import { ArrowLeft } from 'lucide-react'
import TrainMenu from "@/components/TrainMenu"
import { useQueryState } from "@/context/query"
import { UserStatusHeader } from "../SecretDerivation"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import dynamic from "next/dynamic"

const WalletsHeader = dynamic(() => import("../Wallet/ConnectedWallets.tsx").then((comp) => comp.WalletsHeader), {
   loading: () => <></>
})
function HeaderWithMenu({ goBack }: { goBack: (() => void) | undefined | null }) {
   const query = useQueryState()
   const { isMobile } = useWindowDimensions()

   return (
      <div className="items-center justify-between sm:flex sm:items-center grid grid-cols-5 w-full sm:grid-cols-none sm:grid-none mt-2 pb-2 px-4">
         <div className="self-center col-start-1 md:col-start-2 md:col-span-3 justify-self-start md:justify-self-center flex items-center gap-2">
            {
               goBack &&
               <div className="ml-0 sm:ml-2">
                  <IconButton onClick={goBack}
                     aria-label="Go back"
                     className="sm:-ml-2 inline-flex"
                     icon={
                        <ArrowLeft strokeWidth="2" />
                     } />
               </div>
            }
            {
               !query.hideLogo && <div className="md:hidden mt-0.5">
                  <GoHomeButton />
               </div>
            }
         </div>
         <div className="col-start-5 justify-self-end self-center flex items-center gap-x-2 sm:gap-x-1">
            {
               isMobile
                  ? <UserStatusHeader />
                  : null
            }
            <WalletsHeader />
            <TrainMenu />
         </div>
      </div>
   )
}

export default HeaderWithMenu