import { FC, useEffect, useRef } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { AnimatePresence } from 'framer-motion';
import HeaderWithMenu from '../HeaderWithMenu';
import AppSettings from '../../lib/AppSettings';

type Props = {
   children: JSX.Element | JSX.Element[];
   wizardId: string;
   className?: string
}

const Wizard: FC<Props> = ({ children, wizardId, className }) => {

   const wrapper = useRef<HTMLDivElement>(null);

   const { setWrapperWidth } = useFormWizardaUpdate()
   const { wrapperWidth, positionPercent, moving, goBack, noToolBar, hideMenu } = useFormWizardState()

   useEffect(() => {
      function handleResize() {
         if (wrapper.current !== null) {
            setWrapperWidth(wrapper.current.offsetWidth);
         }
      }
      window.addEventListener("resize", handleResize);
      handleResize();

      return () => window.removeEventListener("resize", handleResize);
   }, []);

   const width = positionPercent || 0
   return <>
      <div id='widget' className={noToolBar ? `w-full h-full` : ` bg-secondary-900 md:shadow-card rounded-containerRoundness w-full sm:overflow-hidden relative ${AppSettings.ApiVersion === 'sandbox' && 'border-t-[2px] border-[#D95E1B]'}`}>
         <div className="relative z-20 pb-1 sm:pb-0">
            {
               AppSettings.ApiVersion === 'sandbox' && !noToolBar &&
               <div className="absolute -top-1 right-[calc(50%-68px)] bg-[#D95E1B] py-0.5 px-10 rounded-b-md text-xs scale-75">
                  TESTNET
               </div>
            }
         </div>
         {
            !hideMenu &&
            <HeaderWithMenu goBack={goBack} />
         }
         <div className={noToolBar ? 'relative w-full h-full' : `relative px-6 `}>
            <div className="flex items-start" ref={wrapper}>
               <AnimatePresence initial={false} custom={{ direction: moving === "forward" ? 1 : -1, width: wrapperWidth }}>
                  <div className={`flex flex-nowrap grow`}>
                     <div className={`w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full ${className}`}>
                        {children}
                     </div>
                  </div>
               </AnimatePresence>
            </div>
         </div>
         <div id="widget_root" />
      </div>
   </>
}

export default Wizard;