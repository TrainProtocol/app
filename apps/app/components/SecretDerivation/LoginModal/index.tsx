import { useEffect, useState } from 'react';
import { Loader2, ChevronLeft, CircleX } from 'lucide-react';
import VaulModal from '@/components/Modal/vaulModal';
import { useSecretDerivation } from '@/context/secretDerivationContext';
import { classifyError } from '@/lib/errors';
import { PasskeyChoice } from './PasskeyChoice';
import { Wallet } from '@/Models/WalletProvider';
import { useSteps } from '@/hooks/useSteps';
import { Steps, Step } from '@/components/Step';
import OptionSelect from './OptionSelect';
import IconButton from '@/components/buttons/iconButton';
import WalletSelect from './SelectWallet';
import { usePasskeyCredentialIds } from '@/stores/secretDerivationStore';

type LoginStep = 'pick' | 'passkey_recovery' | 'wallet_select' | 'signing';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { loginWithPasskey, loginWithWallet, derivationMessage } = useSecretDerivation();
  const storedPasskeyIds = usePasskeyCredentialIds();
  const hasStoredPasskeys = storedPasskeyIds.length > 0;
  const { currentStep, goToStep, goBack, canGoBack, reset, isStep } = useSteps<LoginStep>({ initial: 'pick' });
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [signingWallet, setSigningWallet] = useState<Wallet | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      reset();
      setPasskeyError(null);
      setSigningError(null);
    }
  }, [isOpen, reset]);

  const closeAndReset = () => {
    onClose();
  };

  const startPasskeyLogin = async (options?: { forceCreate?: boolean; crossDevice?: boolean }) => {
    goToStep('signing');
    setPasskeyError(null);
    try {
      if (options?.forceCreate) {
        await loginWithPasskey({ forceCreate: true, label: 'Train' });
      } else if (options?.crossDevice) {
        await loginWithPasskey({ crossDevice: true });
      } else {
        await loginWithPasskey();
      }
      closeAndReset();
    } catch (e) {
      setPasskeyError(classifyError(e).message);
      goToStep('passkey_recovery', 'back');
    }
  };

  const startWalletLogin = async (wallet: Wallet) => {
    setSigningWallet(wallet);
    setSigningError(null);
    goToStep('signing');
    try {
      await loginWithWallet(wallet);
      closeAndReset();
    } catch (e) {
      setSigningError(classifyError(e).message);
    }
  };

  const onConnectFinish = async (wallet?: Wallet) => {
    if (!wallet) {
      goToStep('wallet_select', 'back');
      return;
    }
    await startWalletLogin(wallet);
  };

  const handleBack = () => {
    if (isStep('passkey_recovery')) {
      setPasskeyError(null);
      reset();
      return;
    }
    goBack();
  };

  return (
    <VaulModal
      show={isOpen}
      setShow={(show) => {
        if (!show) closeAndReset();
      }}
      header={
        <div className="inline-flex items-center gap-1">
          {
            (canGoBack || currentStep === 'signing') &&
            <div className="-ml-2">
              <IconButton onClick={handleBack} icon={
                <ChevronLeft strokeWidth="2" />
              }>
              </IconButton>
            </div>
          }
          <h2>{currentStep === 'signing' ? 'Signing' : 'Login to continue'}</h2>
        </div>
      }
      modalId="secret-derivation-login-modal"
    >
      <VaulModal.Snap id="item-1">
        <Steps currentStep={currentStep}>

          <Step name="pick">
            <OptionSelect onPasskeyLogin={() => startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })} goToStep={goToStep} onConnectFinish={onConnectFinish} />
          </Step>

          <Step name="passkey_recovery">
            <PasskeyChoice
              error={passkeyError || ''}
              onTryAgain={() => startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })}
              onCreateNew={() => startPasskeyLogin({ forceCreate: true })}
              onCrossDeviceLogin={() => startPasskeyLogin({ crossDevice: true })}
            />
          </Step>

          <Step name="wallet_select">
            <WalletSelect startWalletLogin={startWalletLogin} />
          </Step>

          <Step name="signing">
            <Signing
              derivationMessage={derivationMessage}
              onRetry={signingWallet ? () => startWalletLogin(signingWallet) : undefined}
              onCancel={() => goToStep('pick')}
              error={signingError}
              isPasskey={!signingWallet}
            />
          </Step>

        </Steps>
      </VaulModal.Snap>
    </VaulModal>
  );
}


const Signing = ({
  derivationMessage,
  onRetry,
  onCancel,
  error,
  isPasskey
}: {
  derivationMessage: string;
  onRetry?: () => void;
  onCancel: () => void;
  error?: string | null;
  isPasskey?: boolean;
}) => {
  // Platform-specific hint text
  const getPlatformHint = () => {
    if (!isPasskey) return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'Use Touch ID or your security key to confirm';
    if (ua.includes('windows')) return 'Use Windows Hello or your security key to confirm';
    if (/iphone|ipad/.test(ua)) return 'Use Face ID or Touch ID to confirm';
    if (ua.includes('android')) return 'Use your fingerprint or screen lock to confirm';
    return null;
  };

  const platformHint = getPlatformHint();

  const icon = error
    ? <CircleX className="w-8 h-8 text-primary-500" />
    : <Loader2 className="w-8 h-8 text-primary animate-spin" />;

  const title = error
    ? 'Failed'
    : (derivationMessage || 'Please sign…');

  const subtitle = error
    ? error
    : (platformHint || 'Complete the action in your passkey or wallet.');

  return (
    <div className="flex flex-col items-center justify-center gap-5 pt-10">
      <div className="w-14 h-14 rounded-2xl bg-secondary-700 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center space-y-1">
        <p className="text-primary-text font-semibold">{title}</p>
        <p className="text-sm text-secondary-text max-w-[280px]">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-700 bg-secondary-800 text-primary-text hover:bg-secondary-700 transition-colors text-sm"
          >
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-700 bg-secondary-800 text-primary-text hover:bg-secondary-700 transition-colors text-sm"
        >
          {error ? 'Back' : 'Cancel'}
        </button>
      </div>
    </div>
  );
};
