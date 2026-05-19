import { useMemo, useState } from 'react';

export type LoginStep = 'unsupported' | 'intro' | 'create' | 'signing' | 'error';

export interface LoginWizard {
  history: LoginStep[];
  errorMessage: string | null;
  push: (step: LoginStep) => void;
  pop: () => void;
  replaceTop: (step: LoginStep) => void;
  resetTo: (step: LoginStep) => void;
  setErrorMessage: (msg: string | null) => void;
}

export function useLoginWizardState(): LoginWizard {
  const [history, setHistory] = useState<LoginStep[]>(['intro']);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  return useMemo(
    () => ({
      history,
      errorMessage,
      push: (step) => setHistory((h) => [...h, step]),
      pop: () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)),
      replaceTop: (step) => setHistory((h) => [...h.slice(0, -1), step]),
      resetTo: (step) => setHistory([step]),
      setErrorMessage,
    }),
    [history, errorMessage],
  );
}

export const loginStepTitle = (step: LoginStep): string =>
  step === 'signing' ? 'Signing'
    : step === 'unsupported' ? ''
    : step === 'create' ? ''
    : step === 'error' ? 'Login failed'
    : 'Log in';

// Back is available when there's something in the stack behind us, except while
// signing is in-flight (can't abort mid-WebAuthn) or on the terminal unsupported screen.
export const wizardCanGoBack = (history: LoginStep[]): boolean => {
  const top = history[history.length - 1];
  return history.length > 1 && top !== 'signing' && top !== 'unsupported';
};
