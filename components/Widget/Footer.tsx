import { motion } from "framer-motion";
import { useMeasure } from "@uidotdev/usehooks";
import useWindowDimensions from "@/hooks/useWindowDimensions";

const variants = {
    enter: () => {
        return ({
            opacity: 0,
            y: '100%',
        })
    },
    center: () => {
        return ({
            opacity: 1,
            y: 0,
        })
    },
    exit: () => {
        return ({
            y: '100%',
            zIndex: 0,
            opacity: 0,
        })
    },
};

type FooterProps = {
    hidden?: boolean,
    children?: JSX.Element | JSX.Element[];
    sticky?: boolean
}

const Footer = ({ children, hidden, sticky = true }: FooterProps) => {
    let [footerRef, { height }] = useMeasure();
    const { isMobile } = useWindowDimensions()

    return (
        sticky ?
            <>
                <motion.div
                    ref={footerRef}
                    transition={{
                        duration: 0.15,
                    }}
                    custom={{ direction: -1, width: 100 }}
                    variants={variants}
                    className={`text-primary-text text-base
                        max-sm:fixed
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:z-30
                        max-sm:bg-secondary-transparent
                        max-sm:shadow-widget-footer 
                        max-sm:p-4 
                        max-sm:px-4 
                        max-sm:w-full ${hidden ? 'animation-slide-out' : ''} w-full`}>
                    {children}
                </motion.div>

                {
                    isMobile
                        ? <div style={{ height: `${height ? height - 20 : 0}px` }}
                            className={`text-primary-text text-base      
                             max-sm:inset-x-0
                             max-sm:bottom-0 
                             max-sm:w-full invisible sm:hidden w-full`}>
                        </div>
                        : null
                }
            </>
            :
            children
    )
}
export default Footer;