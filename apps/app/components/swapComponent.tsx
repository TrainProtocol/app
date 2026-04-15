import { FC } from 'react';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';
import { QuoteDirectionProvider } from '../context/quoteDirectionContext';

const Swap: FC = () => {

  return (
    <div className="text-primary-text z-10">
      <SWRConfig>
        <TimerProvider>
          <QuoteDirectionProvider>
            <Atomic />
          </QuoteDirectionProvider>
        </TimerProvider>
      </SWRConfig>
    </div >
  )
};


export default Swap;