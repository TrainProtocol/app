import { FC, useEffect, useRef } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '@/context/formWizardProvider';
import { AnimatePresence } from 'framer-motion';
import HeaderWithMenu from '../HeaderWithMenu';
import TestnetBadge from '../TestnetBadge';

type Props = {
   children: JSX.Element | JSX.Element[];
   wizardId: string;
   className?: string
}

const Wizard: FC<Props> = ({ children, wizardId, className }) => {

   const wrapper = useRef<HTMLDivElement>(null);

   const { setWrapperWidth } = useFormWizardaUpdate()
   const { wrapperWidth, moving, goBack, noToolBar, hideMenu } = useFormWizardState()

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


   return <>
      <div id='widget' className={noToolBar ? `w-full h-full` : ` bg-secondary-700 md:box-shadow rounded-4xl w-full sm:overflow-hidden max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]! relative`}>
         <div className="relative z-20 pb-1 sm:pb-0">
            {!noToolBar && <TestnetBadge />}
         </div>
         {
            !hideMenu &&
            <HeaderWithMenu goBack={goBack} />
         }
         <div className={noToolBar ? 'relative w-full h-full' : `relative px-4 `}>
            <div className="flex items-start h-full" ref={wrapper}>
               <AnimatePresence initial={false} custom={{ direction: moving === "forward" ? 1 : -1, width: wrapperWidth }}>
                  <div className={`flex flex-nowrap grow h-full`}>
                     <div className={`w-full pb-4 flex flex-col justify-between space-y-5 text-secondary-text h-full! ${className}`}>
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