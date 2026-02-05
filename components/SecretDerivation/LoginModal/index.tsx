import { useEffect, useState } from 'react';
import { useConfig } from 'wagmi';
import { Loader2, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import VaulModal from '../../Modal/vaulModal';
import { useSecretDerivation } from '@/context/secretDerivationContext';
import { PasskeyChoice } from './PasskeyChoice';
import { Wallet } from '@/Models/WalletProvider';
import { useSteps } from '@/hooks/useSteps';
import { Steps, Step } from '@/components/Step';
import OptionSelect from './OptionSelect';
import IconButton from '@/components/buttons/iconButton';
import WalletSelect from './SelectWallet';

type LoginStep = 'pick' | 'passkey_choice' | 'wallet_select' | 'signing';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const config = useConfig();
  const { loginWithPasskey, loginWithNewPasskey, loginWithWallet, derivationMessage } = useSecretDerivation();
  const { currentStep, goToStep, goBack, canGoBack, reset, isStep } = useSteps<LoginStep>({ initial: 'pick' });
  const [noPasskeyHint, setNoPasskeyHint] = useState(false);

  useEffect(() => {
    if (isOpen) {
      reset();
      setNoPasskeyHint(false);
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
    } catch (e: any) {
      toast.error(e?.message || 'Passkey login failed');
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
    } catch (e: any) {
      toast.error(e?.message || 'Passkey login failed');
      goToStep('passkey_choice', 'back');
    }
  };

  const startWalletLogin = async (wallet: Wallet) => {
    goToStep('signing');
    try {
      await loginWithWallet(config, wallet);
      toast.success('Logged in with wallet');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.message || 'Wallet login failed');
      goToStep('wallet_select', 'back');
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
            <Signing derivationMessage={derivationMessage} />
          </Step>

        </Steps>
      </VaulModal.Snap>
    </VaulModal>
  );
}


const Signing = ({ derivationMessage }: { derivationMessage: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      <div className="w-14 h-14 rounded-2xl bg-secondary-700 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <p className="text-center text-primary-text font-semibold">
        {derivationMessage || 'Please sign…'}
      </p>
      <p className="text-sm text-secondary-text text-center max-w-[260px]">
        Complete the action in your passkey or wallet. Do not close this window.
      </p>
    </div>
  )
}
