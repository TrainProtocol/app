import { ReactNode, useEffect, useState } from 'react';
import { Loader2, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useSharedSecretDerivation } from '@train-protocol/react';
import { mapPasskeyError } from '@train-protocol/auth';
import { EntryStep, CreateStep, ErrorStep } from './PasskeyChoice';
import { PasskeyFAQModal } from './LoginFAQ';
import { loginStepTitle, useLoginWizardState, wizardCanGoBack, type LoginWizard } from './wizard';
import { Steps, Step } from '@/components/Step';
import IconButton from '@/components/buttons/iconButton';
import { StepBody } from '../StepBody';
import { loginPasskeyWallet, type LoginPasskeyWalletOptions } from '@/lib/passkeyWallet/login';

export { loginStepTitle, useLoginWizardState, wizardCanGoBack };
export type { LoginStep, LoginWizard } from './wizard';

function useLoginFlow({
  isOpen,
  onClose,
  wizard,
}: {
  isOpen: boolean;
  onClose: () => void;
  wizard: LoginWizard;
}): {
  header: ReactNode;
  content: ReactNode;
} {
  const sd = useSharedSecretDerivation();
  const {
    derivationMessage,
    passkeyCredentials,
    clearAllPasskeyCredentials,
    isReady,
    prfSupportDetails,
  } = sd;
  const { history, errorMessage, push, pop, replaceTop, resetTo, setErrorMessage } = wizard;
  const currentStep = history[history.length - 1];
  const [faqOpen, setFaqOpen] = useState(false);

  const passkeyUnsupported = isReady && prfSupportDetails && !prfSupportDetails.supported;

  // On modal open, pick the entry step from current storage + support state. No auto-login.
  useEffect(() => {
    if (!isOpen || !isReady) return;
    setErrorMessage(null);
    if (passkeyUnsupported) resetTo('unsupported');
    else resetTo('intro');
    // intentionally only runs when the modal opens / readiness flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isReady, passkeyUnsupported]);

  const canGoBack = wizardCanGoBack(history);

  const runLogin = async (options?: LoginPasskeyWalletOptions) => {
    setErrorMessage(null);
    push('signing');
    try {
      await loginPasskeyWallet(sd, options);
      onClose();
    } catch (e) {
      const missingPasskey = e instanceof Error && /no passkey found/i.test(e.message);
      const message = options?.credentialId && missingPasskey
        ? 'This saved login is no longer available on this device. Pick another or create a new passkey.'
        : mapPasskeyError(e);
      setErrorMessage(message);
      replaceTop('error');
    }
  };

  const headerTitle = loginStepTitle(currentStep);
  const showHeaderTitle = currentStep !== 'intro' || passkeyCredentials.length > 0;

  const header = (
    <div className="inline-flex items-center gap-1">
      {canGoBack && (
        <div className="-ml-2">
          <IconButton onClick={pop} icon={<ChevronLeft strokeWidth="2" />} />
        </div>
      )}
      {showHeaderTitle && <h2>{headerTitle}</h2>}
    </div>
  );

  const content = (
    <>
      <Steps currentStep={currentStep}>
        <Step name="unsupported">
          <UnsupportedBrowser onClose={onClose} />
        </Step>

        <Step name="intro">
          <EntryStep
            credentials={passkeyCredentials}
            onPick={(credentialId) => runLogin({ credentialId })}
            onCreateNew={() => push('create')}
            onLoginWithExisting={() => runLogin({ crossDevice: true })}
            onForgetAll={clearAllPasskeyCredentials}
            onShowFaq={() => setFaqOpen(true)}
          />
        </Step>

        <Step name="create">
          <CreateStep
            onCreate={(label) => runLogin({ forceCreate: true, label: label || undefined })}
          />
        </Step>

        <Step name="signing">
          <Signing derivationMessage={derivationMessage} />
        </Step>

        <Step name="error">
          <ErrorStep message={errorMessage || ''} onBack={pop} />
        </Step>
      </Steps>
      <PasskeyFAQModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </>
  );

  return { header, content };
}

interface LoginFlowProps {
  isOpen: boolean;
  onClose: () => void;
  hideHeader?: boolean;
  wizard: LoginWizard;
}

export function LoginFlow({ isOpen, onClose, hideHeader, wizard }: LoginFlowProps) {
  const { header, content } = useLoginFlow({ isOpen, onClose, wizard });

  return (
    <div className="flex flex-col flex-1 h-full">
      {!hideHeader && <div className="px-4 pt-3 pb-2 text-secondary-text">{header}</div>}
      <div className="px-4 flex-1 flex flex-col">{content}</div>
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
        <p className="text-sm text-secondary-text max-w-70">
          Currently, only passkey login is available. Your browser does not support the required passkey features (PRF extension).
        </p>
        <p className="text-sm text-secondary-text max-w-70">
          Please try opening this site in a supported browser such as <span className="text-primary-text font-medium">Google Chrome</span>, <span className="text-primary-text font-medium">Safari</span>, <span className="text-primary-text font-medium">Microsoft Edge</span>, or <span className="text-primary-text font-medium">Brave</span>.
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

const Signing = ({ derivationMessage }: { derivationMessage: string }) => {
  const platformHint = (() => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'Use Touch ID or your security key to confirm';
    if (ua.includes('windows')) return 'Use Windows Hello or your security key to confirm';
    if (/iphone|ipad/.test(ua)) return 'Use Face ID or Touch ID to confirm';
    if (ua.includes('android')) return 'Use your fingerprint or screen lock to confirm';
    return null;
  })();

  const info = (
    <>
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-text animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-primary-text font-semibold">{derivationMessage || 'Please sign…'}</p>
        <p className="text-sm text-secondary-text max-w-[280px]">{platformHint || 'Complete the action in your passkey or wallet.'}</p>
      </div>
    </>
  );

  return <StepBody info={info} actions={null} />;
};
