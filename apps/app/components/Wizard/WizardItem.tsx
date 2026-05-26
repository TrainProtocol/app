import { motion } from 'framer-motion';
import { FC, useEffect } from 'react'
import { useFormWizardaUpdate, useFormWizardState } from '../../context/formWizardProvider';
import { Steps } from '../../Models/Wizard';

type Props = {
    StepName: Steps,
    PositionPercent?: number,
    GoBack?: () => void,
    children: JSX.Element | JSX.Element[];
    fitHeight?: boolean,
    className?: string;
    inModal?: boolean;
    disableAnimation?: boolean;
}

const WizardItem: FC<Props> = (({ StepName, children, GoBack, PositionPercent, fitHeight = false, className, inModal, disableAnimation }: Props) => {
    const { currentStepName, wrapperWidth, moving } = useFormWizardState()
    const { setGoBack, setPositionPercent } = useFormWizardaUpdate()
    const styleConfigs = fitHeight ? { width: `${wrapperWidth}px`, height: '100%' } : { width: `${wrapperWidth}px`, minHeight: inModal ? 'inherit' : '350px', height: '100%' }

    useEffect(() => {
        if (currentStepName === StepName) {
            setGoBack(GoBack)
            PositionPercent && setPositionPercent(PositionPercent)
        }
    }, [currentStepName, StepName])

    if (currentStepName !== StepName) return null

    if (disableAnimation) {
        return (
            <div className='h-full'>
                <div style={styleConfigs} className={className}>
                    {Number(wrapperWidth) > 1 && children}
                </div>
            </div>
        )
    }

    return (
        <motion.div
            className='h-full'
            whileInView="done"
            key={currentStepName as string}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={{ direction: moving === "back" ? -1 : 1, width: wrapperWidth }}>
            <div style={styleConfigs} className={className}>
                {Number(wrapperWidth) > 1 && children}
            </div>
        </motion.div>
    )
})

let variants = {
    enter: ({ direction, width }) => ({
        x: direction * width,
    }),
    center: {
        x: 0,
        transition: {
            duration: 0.2,
            when: "beforeChildren",
        },
    },
    exit: ({ direction, width }) => ({
        x: direction * -width,
    }),
};

export default WizardItem;