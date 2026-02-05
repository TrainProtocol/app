import { useState } from 'react';
import { KeyRound, AlertTriangle } from 'lucide-react';
import SubmitButton from '../../buttons/submitButton';

interface PasskeyChoiceProps {
  onUseExisting: () => void;
  onCreateNew: (label?: string) => void;
  noPasskeyHint?: boolean;
}

export function PasskeyChoice({ onUseExisting, onCreateNew, noPasskeyHint }: PasskeyChoiceProps) {

  const handleCreateNew = () => {
    onCreateNew('Train');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary-700 flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-primary-text" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-primary-text text-center">Sign in with passkey</h2>
      </div>

      <div className="flex flex-col gap-3">
        <SubmitButton
          type="button"
          onClick={onUseExisting}
        >
          Use existing passkey
        </SubmitButton>
        {noPasskeyHint && (
          <div className="flex items-start gap-2 rounded-xl bg-red-900/40 border border-red-800/60 px-3 py-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-red-200/90 text-sm leading-snug">
              No passkey found for any related origin
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-secondary-600" />
        <span className="text-sm font-medium text-secondary-text uppercase">OR</span>
        <div className="flex-1 h-px bg-secondary-600" />
      </div>
      <SubmitButton
        type="button"
        onClick={handleCreateNew}
      >
        Create new passkey
      </SubmitButton>
    </div>
  );
}
