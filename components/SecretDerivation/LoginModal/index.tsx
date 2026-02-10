import { useEffect, useState } from 'react';
import { useConfig } from 'wagmi';
import { Loader2, ChevronLeft, CircleX } from 'lucide-react';
import toast from 'react-hot-toast';
import VaulModal from '@/components/Modal/vaulModal';
import { useSecretDerivation } from '@/context/secretDerivationContext';
import { PasskeyChoice } from './PasskeyChoice';
import { Wallet } from '@/Models/WalletProvider';
import { useSteps } from '@/hooks/useSteps';
import { Steps, Step } from '@/components/Step';
import OptionSelect from './OptionSelect';
import IconButton from '@/components/buttons/iconButton';
import WalletSelect from './SelectWallet';

type LoginStep = 'pick' | 'passkey_choice' | 'wallet_select' | 'signing';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const config = useConfig();
  const { loginWithPasskey, loginWithNewPasskey, loginWithWallet, derivationMessage } = useSecretDerivation();
  const { currentStep, goToStep, goBack, canGoBack, reset, isStep } = useSteps<LoginStep>({ initial: 'pick' });
  const [noPasskeyHint, setNoPasskeyHint] = useState(false);
  const [signingWallet, setSigningWallet] = useState<Wallet | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      reset();
      setNoPasskeyHint(false);
      setSigningError(null);
    }
  }, [isOpen, reset]);

  const closeAndReset = () => {
    onClose();
  };

  const startUseExistingPasskey = async () => {
    goToStep('signing');
    setNoPasskeyHint(false);
    try {
      await loginWithPasskey({ createIfMissing: false });
      toast.success('Logged in with passkey');
      closeAndReset();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Passkey login failed'));
      setNoPasskeyHint(true);
      goToStep('passkey_choice', 'back');
    }
  };

  const startCreateNewPasskey = async (label?: string) => {
    goToStep('signing');
    try {
      await loginWithNewPasskey(label);
      toast.success('Logged in with passkey');
      closeAndReset();
    } catch (e) {
      toast.error(getErrorMessage(e, 'Passkey login failed'));
      goToStep('passkey_choice', 'back');
    }
  };

  const startWalletLogin = async (wallet: Wallet) => {
    setSigningWallet(wallet);
    setSigningError(null);
    goToStep('signing');
    try {
      await loginWithWallet(config, wallet);
      toast.success('Logged in with wallet');
      closeAndReset();
    } catch (e) {
      const message = getErrorMessage(e, 'Wallet login failed');
      setSigningError(message);
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
    if (isStep('passkey_choice')) {
      setNoPasskeyHint(false);
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
        <div className="inline-flex items-center">
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
            <OptionSelect goToStep={goToStep} onConnectFinish={onConnectFinish} />
          </Step>

          <Step name="passkey_choice">
            <PasskeyChoice
              onUseExisting={startUseExistingPasskey}
              onCreateNew={startCreateNewPasskey}
              noPasskeyHint={noPasskeyHint}
            />
          </Step>

          <Step name="wallet_select">
            <WalletSelect startWalletLogin={startWalletLogin} />
          </Step>

          <Step name="signing">
            <Signing
              derivationMessage={derivationMessage}
              onRetry={signingWallet ? () => startWalletLogin(signingWallet) : undefined}
              error={signingError}
            />
          </Step>

        </Steps>
      </VaulModal.Snap>
    </VaulModal>
  );
}


const Signing = ({ derivationMessage, onRetry, error }: { derivationMessage: string, onRetry?: () => void, error?: string | null }) => {
  const [showRetry, setShowRetry] = useState(false);
  const showButton = error ? !!onRetry : showRetry && !!onRetry;

  useEffect(() => {
    setShowRetry(false);
    if (!onRetry || error) return;
    const timer = setTimeout(() => setShowRetry(true), 10000);
    return () => clearTimeout(timer);
  }, [onRetry, error]);

  const icon = error
    ? <CircleX className="w-8 h-8 text-primary-500" />
    : <Loader2 className="w-8 h-8 text-primary animate-spin" />;

  const title = error
    ? 'Failed'
    : (derivationMessage || 'Please sign…');

  const subtitle = error
    ? error
    : 'Complete the action in your passkey or wallet. Do not close this window.';

  return (
    <div className={`flex flex-col items-center justify-center gap-5 pt-10 ${showButton ? 'pb-5' : 'pb-10'}`}>
      <div className="w-14 h-14 rounded-2xl bg-secondary-700 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center space-y-1">
        <p className="text-primary-text font-semibold">{title}</p>
        <p className="text-sm text-secondary-text max-w-[280px]">{subtitle}</p>
      </div>
      {showButton && (
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-700 bg-secondary-800 text-primary-text hover:bg-secondary-700 transition-colors text-sm"
        >
          Try again
        </button>
      )}
    </div>
  )
}
