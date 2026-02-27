import { useState, useCallback, useMemo } from 'react';

type Direction = 'forward' | 'back';

interface StepConfig<T extends string> {
  initial: T;
}

interface UseStepsReturn<T extends string> {
  currentStep: T;
  direction: Direction;
  canGoBack: boolean;
  goToStep: (step: T, direction?: Direction) => void;
  goBack: () => void;
  reset: () => void;
  isStep: (step: T) => boolean;
}

function useSteps<T extends string>(config: StepConfig<T>): UseStepsReturn<T> {
  const { initial } = config;

  const [currentStep, setCurrentStep] = useState<T>(initial);
  const [direction, setDirection] = useState<Direction>('forward');
  const [stepHistory, setStepHistory] = useState<T[]>([initial]);

  const canGoBack = useMemo(() => stepHistory.length > 1, [stepHistory]);

  const goToStep = useCallback((step: T, dir?: Direction) => {
    const newDirection = dir ?? 'forward';
    setDirection(newDirection);
    setCurrentStep(step);

    if (newDirection === 'forward') {
      setStepHistory(prev => [...prev, step]);
    }
  }, []);

  const goBack = useCallback(() => {
    if (stepHistory.length <= 1) return;

    setDirection('back');
    setStepHistory(prev => {
      const newHistory = prev.slice(0, -1);
      const previousStep = newHistory[newHistory.length - 1];
      setCurrentStep(previousStep);
      return newHistory;
    });
  }, [stepHistory.length]);

  const reset = useCallback(() => {
    setCurrentStep(initial);
    setDirection('forward');
    setStepHistory([initial]);
  }, [initial]);

  const isStep = useCallback((step: T) => currentStep === step, [currentStep]);

  return {
    currentStep,
    direction,
    canGoBack,
    goToStep,
    goBack,
    reset,
    isStep,
  };
}

export { useSteps };
