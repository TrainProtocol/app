import { ReactNode, useEffect, useRef, useState } from 'react';
import { Loader2, ChevronLeft, CircleX, AlertTriangle } from 'lucide-react';
import VaulModal from '@/components/Modal/vaulModal';
import { useSharedSecretDerivation } from '@train-protocol/react';
import { mapPasskeyError } from '@train-protocol/auth';
import { PasskeyChoice } from './PasskeyChoice';
import { useSteps } from '@/hooks/useSteps';
import { Steps, Step } from '@/components/Step';
import IconButton from '@/components/buttons/iconButton';
import { useSettingsOverlayStore } from '@/stores/settingsOverlayStore';
import { StepBody } from '@/components/Settings/SettingsOverlay';

type LoginStep = 'unsupported' | 'passkey_recovery' | 'signing';

function useLoginFlow({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }): {
  header: ReactNode;
  content: ReactNode;
} {
  const { loginWithPasskey, derivationMessage, passkeyCredentials, isReady, prfSupportDetails } = useSharedSecretDerivation();
  const hasStoredPasskeys = passkeyCredentials.length > 0;
  const { currentStep, goToStep, goBack, canGoBack, reset, isStep } = useSteps<LoginStep>({ initial: 'signing' });
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [signingError, setSigningError] = useState<string | null>(null);
  const loginTriggered = useRef(false);

  const passkeyUnsupported = isReady && prfSupportDetails && !prfSupportDetails.supported;

  useEffect(() => {
    if (isOpen) {
      reset();
      setPasskeyError(null);
      setSigningError(null);
      loginTriggered.current = false;
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
      const message = mapPasskeyError(e);
      setPasskeyError(message);
      goToStep('passkey_recovery', 'back');
    }
  };

  useEffect(() => {
    if (isOpen && isReady && !loginTriggered.current) {
      loginTriggered.current = true;
      if (passkeyUnsupported) {
        goToStep('unsupported');
        return;
      }
      const timer = setTimeout(() => {
        startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isReady]);

  const handleBack = () => {
    if (isStep('passkey_recovery')) {
      closeAndReset();
      return;
    }
    goBack();
  };

  const header = (
    <div className="inline-flex items-center gap-1">
      {canGoBack && (
        <div className="-ml-2">
          <IconButton onClick={handleBack} icon={<ChevronLeft strokeWidth="2" />} />
        </div>
      )}
      <h2>
        {currentStep === 'signing'
          ? 'Signing'
          : currentStep === 'unsupported'
            ? 'Browser not supported'
            : 'Login to continue'}
      </h2>
    </div>
  );

  const content = (
    <Steps currentStep={currentStep}>
      <Step name="unsupported">
        <UnsupportedBrowser onClose={closeAndReset} />
      </Step>

      <Step name="passkey_recovery">
        <PasskeyChoice
          error={passkeyError || ''}
          onTryAgain={() => startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })}
          onCreateNew={() => startPasskeyLogin({ forceCreate: true })}
          onCrossDeviceLogin={() => startPasskeyLogin({ crossDevice: true })}
        />
      </Step>

      <Step name="signing">
        <Signing
          derivationMessage={derivationMessage}
          onCancel={closeAndReset}
          error={signingError}
          isPasskey
        />
      </Step>
    </Steps>
  );

  return { header, content };
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { header, content } = useLoginFlow({ isOpen, onClose });

  return (
    <VaulModal
      show={isOpen}
      setShow={(show) => {
        if (!show) onClose();
      }}
      header={header}
      modalId="secret-derivation-login-modal"
    >
      <VaulModal.Snap id="item-1">{content}</VaulModal.Snap>
    </VaulModal>
  );
}

interface LoginFlowProps {
  isOpen: boolean;
  onClose: () => void;
  hideHeader?: boolean;
}

export function LoginFlow({ isOpen, onClose, hideHeader }: LoginFlowProps) {
  const { header, content } = useLoginFlow({ isOpen, onClose });
  const inOverlay = useSettingsOverlayStore((s) => s.view !== null);

  return (
    <div className={`flex flex-col${inOverlay ? ' flex-1' : ''}`}>
      {!hideHeader && <div className="px-4 pt-3 pb-2 text-secondary-text">{header}</div>}
      <div className={`px-4 pb-4${inOverlay ? ' flex-1 flex flex-col' : ''}`}>{content}</div>
    </div>
  );
}


const UnsupportedBrowser = ({ onClose }: { onClose: () => void }) => {
  const info = (
    <>
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-secondary-text" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-primary-text font-semibold">Passkey login is not supported</p>
        <p className="text-sm text-secondary-text max-w-[280px]">
          Currently, only passkey login is available. Your browser does not support the required passkey features (PRF extension).
        </p>
        <p className="text-sm text-secondary-text max-w-[280px]">
          Please try opening this site in a supported browser such as <span className="text-primary-text font-medium">Google Chrome</span>, <span className="text-primary-text font-medium">Microsoft Edge</span>, or <span className="text-primary-text font-medium">Brave</span>.
        </p>
      </div>
    </>
  );

  const action = (
    <button
      type="button"
      onClick={onClose}
      className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-400 bg-secondary-500 text-primary-text hover:bg-secondary-400 transition-colors text-sm"
    >
      Close
    </button>
  );

  return <StepBody info={info} actions={action} />;
};

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
    ? <CircleX className="w-8 h-8 text-secondary-text" />
    : <Loader2 className="w-8 h-8 text-primary-text animate-spin" />;

  const title = error
    ? 'Failed'
    : (derivationMessage || 'Please sign…');

  const subtitle = error
    ? error
    : (platformHint || 'Complete the action in your passkey or wallet.');

  const info = (
    <>
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
        {icon}
      </div>
      <div className="text-center space-y-1">
        <p className="text-primary-text font-semibold">{title}</p>
        <p className="text-sm text-secondary-text max-w-[280px]">{subtitle}</p>
      </div>
    </>
  );

  const actions = (
    <div className="flex flex-col gap-2 w-full">
      {error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-400 bg-secondary-500 text-primary-text hover:bg-secondary-400 transition-colors text-sm"
        >
          Try again
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-400 bg-secondary-500 text-primary-text hover:bg-secondary-400 transition-colors text-sm"
      >
        {error ? 'Back' : 'Cancel'}
      </button>
    </div>
  );

  return <StepBody info={info} actions={actions} />;
};
