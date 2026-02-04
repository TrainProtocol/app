import { useEffect, useMemo, useState } from 'react';
import { useConfig } from 'wagmi';
import { Fingerprint, Loader2, Wallet as WalletIcon, Plus, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import VaulModal from '../Modal/vaulModal';
import { useSecretDerivation } from '@/context/secretDerivationContext';
import useEVM from '@/lib/wallets/evm/useEVM';
import { PasskeyChoice } from './PasskeyChoice';
import { Wallet } from '@/Models/WalletProvider';
import ConnectorsList from '@/components/WalletModal/ConnectorsList';
import { useConnectModal } from '@/components/WalletModal';

type Step = 'pick' | 'passkey_choice' | 'wallet_select' | 'connect' | 'signing';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortAddress = (address?: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const config = useConfig();
  const evmProvider = useEVM();
  const { setSelectedProvider, setSelectedConnector, setSelectedMultiChainConnector } = useConnectModal();
  const { loginWithPasskey, loginWithNewPasskey, loginWithWallet, isPasskeySupported, derivationMessage } = useSecretDerivation();
  const [step, setStep] = useState<Step>('pick');
  const [isBusy, setIsBusy] = useState(false);
  const [noPasskeyHint, setNoPasskeyHint] = useState(false);

  const connectedWallets = useMemo(
    () => evmProvider.connectedWallets?.filter(w => w.providerName?.toLowerCase() === 'evm') || [],
    [evmProvider.connectedWallets]
  );

  useEffect(() => {
    if (isOpen) {
      setStep('pick');
      setIsBusy(false);
      setNoPasskeyHint(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'connect') {
      setSelectedProvider(evmProvider);
      setSelectedConnector(undefined);
      setSelectedMultiChainConnector(undefined);
    }
  }, [step, evmProvider, setSelectedProvider, setSelectedConnector, setSelectedMultiChainConnector]);

  const closeAndReset = () => {
    setSelectedProvider(undefined);
    setSelectedConnector(undefined);
    setSelectedMultiChainConnector(undefined);
    onClose();
  };

  const startUseExistingPasskey = async () => {
    setStep('signing');
    setIsBusy(true);
    setNoPasskeyHint(false);
    try {
      await loginWithPasskey({ createIfMissing: false });
      toast.success('Logged in with passkey');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.message || 'Passkey login failed');
      setNoPasskeyHint(true);
      setStep('passkey_choice');
    } finally {
      setIsBusy(false);
    }
  };

  const startCreateNewPasskey = async (label?: string) => {
    setStep('signing');
    setIsBusy(true);
    try {
      await loginWithNewPasskey(label);
      toast.success('Logged in with passkey');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.message || 'Passkey login failed');
      setStep('passkey_choice');
    } finally {
      setIsBusy(false);
    }
  };

  const startWalletLogin = async (wallet: Wallet) => {
    setStep('signing');
    setIsBusy(true);
    try {
      await loginWithWallet(config, wallet);
      toast.success('Logged in with wallet');
      closeAndReset();
    } catch (e: any) {
      toast.error(e?.message || 'Wallet login failed');
      setStep('wallet_select');
    } finally {
      setIsBusy(false);
    }
  };

  const onConnectFinish = async (wallet?: Wallet) => {
    if (!wallet) {
      setStep('wallet_select');
      return;
    }
    await startWalletLogin(wallet);
  };

  const canGoBack = step === 'passkey_choice' || step === 'wallet_select' || step === 'connect';

  const handleBack = () => {
    if (step === 'connect') {
      setStep('wallet_select');
      return;
    }
    if (step === 'wallet_select') {
      setStep('pick');
      return;
    }
    if (step === 'passkey_choice') {
      setStep('pick');
      setNoPasskeyHint(false);
    }
  };

  return (
    <VaulModal
      show={isOpen}
      setShow={(show) => {
        if (!show) closeAndReset();
      }}
      header={step === 'signing' ? 'Signing' : 'Login to continue'}
      modalId="secret-derivation-login-modal"
    >
      <VaulModal.Snap id="item-1">
        <div className="flex flex-col gap-4">
          {(canGoBack || step === 'signing') && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={!canGoBack || isBusy}
                className={`flex items-center gap-2 text-sm font-semibold ${canGoBack && !isBusy ? 'text-primary hover:brightness-110' : 'text-secondary-text cursor-not-allowed'
                  }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <span className="text-xs text-secondary-text">
                {step === 'signing' ? 'Waiting for signature' : ''}
              </span>
            </div>
          )}
          {step === 'pick' && (
            <>
              <p className="text-sm text-secondary-text">Choose how to login.</p>
              <div className="flex flex-col gap-3">
                <OptionItem onClick={() => setStep('passkey_choice')} icon={Fingerprint} title="Passkey" description="Face ID, Touch ID, or Windows Hello" />
                <OptionItem onClick={() => setStep('wallet_select')} icon={WalletIcon} title="Wallet (EVM)" description="Select or connect an EVM wallet" />
              </div>
            </>
          )}

          {step === 'passkey_choice' && (
            <PasskeyChoice
              onUseExisting={startUseExistingPasskey}
              onCreateNew={startCreateNewPasskey}
              noPasskeyHint={noPasskeyHint}
            />
          )}

          {step === 'wallet_select' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-text">Select a connected EVM wallet</p>
                <button
                  type="button"
                  onClick={() => setStep('connect')}
                  className="text-sm text-primary hover:brightness-110 font-semibold"
                >
                  Connect new
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {connectedWallets.length === 0 && (
                  <div className="text-sm text-secondary-text bg-secondary-800 border border-secondary-700 rounded-xl p-4">
                    No EVM wallets connected.
                  </div>
                )}
                {connectedWallets.map((wallet) => (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => startWalletLogin(wallet)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-secondary-700 bg-secondary-800 hover:border-secondary-600"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-secondary-700 flex items-center justify-center">
                      {wallet.icon ? <wallet.icon /> : <WalletIcon className="w-5 h-5 text-primary-text" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-primary-text font-semibold">{wallet.displayName || 'EVM Wallet'}</div>
                      <div className="text-xs text-secondary-text">{shortAddress(wallet.address as string)}</div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep('connect')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold border-2 border-secondary-700 bg-secondary-800 text-primary-text hover:bg-secondary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Connect new wallet
              </button>
            </>
          )}

          {step === 'connect' && (
            <>
              <p className="text-sm text-secondary-text">Connect an EVM wallet</p>
              <ConnectorsList onFinish={onConnectFinish} />
            </>
          )}

          {step === 'signing' && (
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
          )}
        </div>
      </VaulModal.Snap>
    </VaulModal>
  );
}


const OptionItem = ({ onClick, icon: Icon, title, description }: { onClick: () => void, icon: (props: { className: string }) => React.ReactNode, title: string, description: string }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border-2 border-secondary-700 bg-secondary-800 hover:border-secondary-600"
    >
      <div className="shrink-0 w-12 h-12 rounded-xl bg-secondary-500 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary-text" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-primary-text">{title}</h3>
        <p className="text-sm text-secondary-text mt-0.5">{description}</p>
      </div>
    </button>
  )
}