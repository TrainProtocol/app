import { motion } from "framer-motion";
import { useMeasure } from "@uidotdev/usehooks";

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
                    className={!!(height && height !== 0) ? `text-primary-text text-base mt-3
                        max-sm:fixed
                        max-sm:inset-x-0
                        max-sm:bottom-0 
                        max-sm:z-30
                        max-sm:bg-secondary-900 
                        max-sm:shadow-widget-footer 
                        max-sm:p-4 
                        max-sm:px-6 
                        max-sm:w-full ${hidden ? 'animation-slide-out' : ''}`
                        : ''}>
                    <div className="relative w-full">
                        {children}
                    </div>
                </motion.div>

                <div style={{ height: `${height}px` }}
                    className={`text-primary-text text-base mt-3        
                             max-sm:inset-x-0
                             max-sm:bottom-0 
                             max-sm:p-4 max-sm:w-full invisible sm:hidden`}>
                </div>
            </ >
            :
            <div className="relative">
                {children}
            </div>
    )
}
export default Footer;