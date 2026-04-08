import { useCallback, useEffect, useRef, useState } from 'react'
import { useSharedSecretDerivation } from '@train-protocol/react'
import { useSteps } from '@/hooks/useSteps'
import { mapPasskeyError } from '@train-protocol/auth'

export type LoginStep = 'unsupported' | 'passkey_recovery' | 'signing'

interface UsePasskeyLoginFlowOptions {
  isActive: boolean
  onSuccess: () => void
  onDismiss: () => void
}

export function usePasskeyLoginFlow({ isActive, onSuccess, onDismiss }: UsePasskeyLoginFlowOptions) {
  const { loginWithPasskey, derivationMessage, prfSupportDetails, isReady, passkeyCredentials } = useSharedSecretDerivation()
  const hasStoredPasskeys = passkeyCredentials.length > 0
  const { currentStep, goToStep, canGoBack, reset } = useSteps<LoginStep>({ initial: 'signing' })
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [signingError, setSigningError] = useState<string | null>(null)
  const loginTriggered = useRef(false)
  const passkeyUnsupported = isReady && prfSupportDetails && !prfSupportDetails.supported

  const startPasskeyLogin = useCallback(async (options?: { forceCreate?: boolean; crossDevice?: boolean }) => {
    goToStep('signing')
    setPasskeyError(null)
    try {
      if (options?.forceCreate) {
        await loginWithPasskey({ forceCreate: true, label: 'Train' })
      } else if (options?.crossDevice) {
        await loginWithPasskey({ crossDevice: true })
      } else {
        await loginWithPasskey()
      }
      onSuccess()
    } catch (e) {
      const message = mapPasskeyError(e)
      setPasskeyError(message)
      goToStep('passkey_recovery', 'back')
    }
  }, [goToStep, loginWithPasskey, onSuccess])

  useEffect(() => {
    if (isActive) {
      reset()
      setPasskeyError(null)
      setSigningError(null)
      loginTriggered.current = false
    }
  }, [isActive, reset])

  useEffect(() => {
    if (isActive && isReady && !loginTriggered.current) {
      loginTriggered.current = true
      if (passkeyUnsupported) {
        goToStep('unsupported')
      } else {
        startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })
      }
    }
  }, [isActive, isReady])

  const handleBack = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  return {
    currentStep,
    canGoBack,
    passkeyError,
    signingError,
    derivationMessage,
    hasStoredPasskeys,
    startPasskeyLogin,
    handleBack,
  }
}
