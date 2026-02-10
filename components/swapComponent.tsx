import { FC } from 'react';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';
import { FormWizardProvider } from '../context/formWizardProvider';
import { AtomicSteps } from '../Models/Wizard';

const Swap: FC = () => {

  return (
    <div className="text-primary-text z-10">
      <SWRConfig>
        <TimerProvider>
          <FormWizardProvider initialStep={AtomicSteps.Form}>
            <Atomic />
          </FormWizardProvider>
        </TimerProvider>
      </SWRConfig>
    </div >
  )
};


export default Swap;