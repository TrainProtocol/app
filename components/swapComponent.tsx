import { FC } from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';
import { FeeProvider } from '../context/feeContext';
import { AtomicProvider } from '../context/atomicContext';

const Swap: FC = () => {

  return (
    <div className="text-primary-text">
      <SWRConfig>
        <SwapDataProvider >
          <AtomicProvider>
            <TimerProvider>
              <FeeProvider>
                <Atomic />
              </FeeProvider>
            </TimerProvider>
          </AtomicProvider>
        </SwapDataProvider >
      </SWRConfig>
    </div >
  )
};


export default Swap;