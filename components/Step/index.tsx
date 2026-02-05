import { createContext, useContext, ReactNode } from 'react';

const StepsContext = createContext<string | null>(null);

interface StepsProps<T extends string> {
  currentStep: T;
  children: ReactNode;
}

export function Steps<T extends string>({ currentStep, children }: StepsProps<T>) {
  return (
    <StepsContext.Provider value={currentStep}>
      {children}
    </StepsContext.Provider>
  );
}

interface StepProps<T extends string> {
  name: T;
  children: ReactNode;
}

export function Step<T extends string>({ name, children }: StepProps<T>) {
  const currentStep = useContext(StepsContext);
  if (currentStep !== name) return null;
  return <>{children}</>;
}
