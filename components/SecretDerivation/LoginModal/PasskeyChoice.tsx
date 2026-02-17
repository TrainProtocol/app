import { AlertTriangle } from 'lucide-react';
import SubmitButton from '../../buttons/submitButton';

interface PasskeyChoiceProps {
  error: string;
  onTryAgain: () => void;
  onCreateNew: (label?: string) => void;
}

export function PasskeyChoice({ error, onTryAgain, onCreateNew }: PasskeyChoiceProps) {
  const handleCreateNew = () => {
    onCreateNew('Train');
  };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-900/40 border border-red-800/60 px-3 py-2.5">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-red-200/90 text-sm leading-snug">
            {error}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SubmitButton
          type="button"
          onClick={onTryAgain}
        >
          Try again
        </SubmitButton>

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
    </div>
  );
}
