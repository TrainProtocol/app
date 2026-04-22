"use client";

import { FC } from 'react';
import { TimerProvider } from '../context/timerContext';
import Atomic from "./Swap/Atomic"
import { SWRConfig } from 'swr';

const Swap: FC = () => {

  return (
    <div className="text-primary-text z-10">
      <SWRConfig>
        <TimerProvider>
          <Atomic />
        </TimerProvider>
      </SWRConfig>
    </div >
  )
};


export default Swap;