import { Loader2, ChevronLeft, CircleX, AlertTriangle } from 'lucide-react';
import VaulModal from '@/components/Modal/vaulModal';
import IconButton from '@/components/buttons/iconButton';
import { LoginSteps } from '../LoginSteps';
import { usePasskeyLoginFlow } from '@/hooks/usePasskeyLoginFlow';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const loginFlow = usePasskeyLoginFlow({
    isActive: isOpen,
    onSuccess: onClose,
    onDismiss: onClose,
  });

  return (
    <VaulModal
      show={isOpen}
      setShow={(show) => {
        if (!show) onClose();
      }}
      header={
        <div className="inline-flex items-center gap-1">
          {
            loginFlow.canGoBack &&
            <div className="-ml-2">
              <IconButton onClick={loginFlow.handleBack} icon={
                <ChevronLeft strokeWidth="2" />
              }>
              </IconButton>
            </div>
          }
          <h2>{loginFlow.currentStep === 'signing' ? 'Signing' : loginFlow.currentStep === 'unsupported' ? 'Browser not supported' : 'Login to continue'}</h2>
        </div>
      }
      modalId="secret-derivation-login-modal"
    >
      <VaulModal.Snap id="item-1">
        <LoginSteps {...loginFlow} onDismiss={onClose} />
      </VaulModal.Snap>
    </VaulModal>
  );
}


export const UnsupportedBrowser = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-5 pt-10">
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
      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 px-4 rounded-xl font-semibold border-2 border-secondary-400 bg-secondary-500 text-primary-text hover:bg-secondary-400 transition-colors text-sm"
      >
        Close
      </button>
    </div>
  );
};

export const Signing = ({
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
    ? <CircleX className="w-8 h-8 text-secondary-text" />
    : <Loader2 className="w-8 h-8 text-primary-text animate-spin" />;

  const title = error
    ? 'Failed'
    : (derivationMessage || 'Please sign\u2026');

  const subtitle = error
    ? error
    : (platformHint || 'Complete the action in your passkey or wallet.');

  return (
    <div className="flex flex-col items-center justify-center gap-5 pt-10">
      <div className="w-14 h-14 rounded-2xl bg-secondary-500 flex items-center justify-center">
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
    </div>
  );
};
