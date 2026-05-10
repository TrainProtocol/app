"use client"

import HeaderWithMenu from "../HeaderWithMenu"
import { usePathname, useRouter } from "next/navigation"
import { default as Content } from './Content';
import { default as Footer } from './Footer';
import { useCallback, useRef } from "react";
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper";
import TestnetBadge from "../TestnetBadge";
import clsx from "clsx";

type Props = {
   children: JSX.Element | JSX.Element[];
   className?: string;
   hideMenu?: boolean;
   mode?: "default" | "fit-content"
}

const Widget = ({ children, className, hideMenu, mode = "default" }: Props) => {
   const router = useRouter()
   const pathname = usePathname()
   const wrapper = useRef(null);

   const goBack = useCallback(() => {
      if (window?.['navigation']?.['canGoBack']) {
         router.back()
         return
      }
      const sp = new URLSearchParams(window.location.search)
      router.push(buildHrefWithPersistantParams("/", sp))
   }, [router])

   const handleBack = pathname === "/" ? null : goBack

   return <>
      <div id='widget' className={clsx(`bg-secondary-700 md:shadow-md border-0 sm:border sm:border-border rounded-3xl w-full sm:overflow-hidden has-expandContainerHeight:min-h-168.75 max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]! relative`,
         {
            "sm:min-h-102": mode == 'default',
         }
      )}>
         <div className="relative z-20 pb-1 sm:pb-0">
            <TestnetBadge />
         </div>
         {
            !hideMenu &&
            <HeaderWithMenu goBack={handleBack} />
         }
         <div className="relative px-4">
            <div className="flex items-start" ref={wrapper}>
               <div className={`flex flex-nowrap grow`}>
                  <div className={`w-full pb-4 flex flex-col justify-between space-y-5 text-secondary-text h-full ${className}`}>
                     {children}
                  </div>
               </div>
            </div>
         </div>
         <div id="widget_root" />
      </div>
   </>
}

Widget.Content = Content
Widget.Footer = Footer

export { Widget }