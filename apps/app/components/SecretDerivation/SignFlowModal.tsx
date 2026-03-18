// components/SecretDerivation/SignFlowModal.tsx
// Single flow: choose method (if needed) → signing state until commit completes

import { useSecretDerivation } from '@/context/secretDerivationContext';
import VaulModal from '../Modal/vaulModal';
import { Loader2 } from 'lucide-react';

interface SignFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignFlowModal({ isOpen, onClose }: SignFlowModalProps) {
  const { derivationMessage } = useSecretDerivation();

  return (
    <VaulModal
      show={isOpen}
      setShow={(show) => {
        if (!show) onClose();
      }}
      header="Signing"
      modalId="secret-derivation-sign-flow"
    >
      <VaulModal.Snap id="item-1">
        <div className="flex flex-col gap-4 min-h-[220px]">
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
        </div>
      </VaulModal.Snap>
    </VaulModal>
  );
}
