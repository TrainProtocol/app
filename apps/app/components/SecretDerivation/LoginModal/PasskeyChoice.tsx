import SubmitButton from '../../buttons/submitButton';
import { usePasskeyCredentialIds } from '@/stores/secretDerivationStore';
import { AlertTriangle, Fingerprint, Wallet as WalletIcon } from 'lucide-react';

interface PasskeyChoiceProps {
  error: string;
  onTryAgain: () => void;
  onCreateNew: () => void;
  onCrossDeviceLogin: () => void;
}

export function PasskeyChoice({ error, onTryAgain, onCreateNew, onCrossDeviceLogin }: PasskeyChoiceProps) {
  const storedIds = usePasskeyCredentialIds();
  const hasStoredPasskeys = storedIds.length > 0;

  return (
    <div className="flex flex-col gap-5">

      <div className="flex flex-col items-center gap-2 pt-6 text-center">
        <div className="p-2.5 bg-secondary-500 rounded-xl">
          <Fingerprint className="w-12 h-12 text-primary-text" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <p className="text-primary-text text-xl font-medium">
            Passkey
          </p>
          <p className="text-secondary-text text-base max-w-xs">
            {hasStoredPasskeys ? 'You have a passkey on this device. Would you like to try again?' : 'You do not have a passkey on this device. Would you like to create one?'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-background border border-error-foreground/20 px-3 py-2.5">
            <AlertTriangle className="w-5 h-5 text-error-foreground shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-error-foreground text-sm leading-snug">
              {error}
            </p>
          </div>
        )}
        {
          hasStoredPasskeys
            ? <>
              <SubmitButton
                type="button"
                onClick={onTryAgain}
              >
                Try again
              </SubmitButton>

              <button
                type="button"
                onClick={onCreateNew}
                className="text-sm text-secondary-text hover:text-primary-text transition-colors text-center underline hover:no-underline w-fit mx-auto"
              >
                Create new passkey
              </button>
            </>
            : <>
              <SubmitButton
                type="button"
                onClick={onCreateNew}
              >
                Create new passkey
              </SubmitButton>
              <button
                type="button"
                onClick={onCrossDeviceLogin}
                className="text-sm text-secondary-text hover:text-primary-text transition-colors text-center underline hover:no-underline w-fit mx-auto"
              >
                Log in using existing passkey
              </button>
            </>
        }
      </div>

    </div>
  );
}
