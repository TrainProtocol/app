import { FC } from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';
import { FeeProvider } from '../context/feeContext';

const Swap: FC = () => {

  return (
    <div className="text-primary-text">
      <SWRConfig>
        <SwapDataProvider >
          <TimerProvider>
            <FeeProvider>
              <Atomic />
            </FeeProvider>
          </TimerProvider>
        </SwapDataProvider >
      </SWRConfig>
    </div >
  )
};


export default Swap;