import { FC } from 'react';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';
import { FeeProvider } from '../context/feeContext';
import { AtomicProvider } from '../context/atomicContext';
import { FormWizardProvider } from '../context/formWizardProvider';
import { AtomicSteps } from '../Models/Wizard';

const Swap: FC = () => {

  return (
    <div className="text-primary-text">
      <SWRConfig>
          <AtomicProvider>
            <TimerProvider>
              <FeeProvider>
                <FormWizardProvider initialStep={AtomicSteps.Form}>
                  <Atomic />
                </FormWizardProvider>
              </FeeProvider>
            </TimerProvider>
          </AtomicProvider>
      </SWRConfig>
    </div >
  )
};


export default Swap;