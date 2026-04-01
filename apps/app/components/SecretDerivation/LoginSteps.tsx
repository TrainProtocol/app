import { FC } from 'react'
import { Steps, Step } from '@/components/Step'
import { PasskeyChoice } from './LoginModal/PasskeyChoice'
import { Signing, UnsupportedBrowser } from './LoginModal'
import type { LoginStep } from '@/hooks/usePasskeyLoginFlow'

interface LoginStepsProps {
  currentStep: LoginStep
  passkeyError: string | null
  signingError: string | null
  derivationMessage: string
  hasStoredPasskeys: boolean
  startPasskeyLogin: (options?: { forceCreate?: boolean; crossDevice?: boolean }) => void
  onDismiss: () => void
}

export const LoginSteps: FC<LoginStepsProps> = ({
  currentStep,
  passkeyError,
  signingError,
  derivationMessage,
  hasStoredPasskeys,
  startPasskeyLogin,
  onDismiss,
}) => (
  <Steps currentStep={currentStep}>
    {/* Wallet login temporarily disabled — passkey is the default */}
    {/* <Step name="pick">
      <OptionSelect onPasskeyLogin={() => startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })} goToStep={goToStep} onConnectFinish={onConnectFinish} />
    </Step> */}
    <Step name="unsupported">
      <UnsupportedBrowser onClose={onDismiss} />
    </Step>
    <Step name="passkey_recovery">
      <PasskeyChoice
        error={passkeyError || ''}
        onTryAgain={() => startPasskeyLogin(hasStoredPasskeys ? {} : { forceCreate: true })}
        onCreateNew={() => startPasskeyLogin({ forceCreate: true })}
        onCrossDeviceLogin={() => startPasskeyLogin({ crossDevice: true })}
      />
    </Step>
    {/* <Step name="wallet_select">
      <WalletSelect startWalletLogin={startWalletLogin} />
    </Step> */}
    <Step name="signing">
      <Signing
        derivationMessage={derivationMessage}
        onCancel={onDismiss}
        error={signingError}
        isPasskey
      />
    </Step>
  </Steps>
)
