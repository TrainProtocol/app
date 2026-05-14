"use client"

import { ChevronDown, KeyRound } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from '@/components/shadcn/accordion';
import AppShellDialog from '@/components/shared/AppShellDialog';
import VaulDrawer from '@/components/Modal/vaulModal';
import useWindowDimensions from '@/hooks/useWindowDimensions';

const DOCS_URL = 'https://docs.train.tech/protocol/atomic-swaps-secret_gen';

const FAQ_ITEMS: { id: string; question: string; answer: string }[] = [
  {
    id: 'faq-1',
    question: 'Why do I need to log in?',
    answer:
      "Train doesn't hold your funds — every swap is unlocked by a secret only you can produce. Logging in with your passkey is how Train generates and caches that secret's initial key on your device, without ever managing your private keys on our servers.",
  },
  {
    id: 'faq-2',
    question: 'What does logging in actually do?',
    answer:
      "Logging in with your passkey derives an initial 'master key' securely in your browser's cache. Train then uses that master key to generate a unique secret for each swap you make — automatically, without asking you to authenticate again. This enables unlimited swaps from a single login.",
  },
  {
    id: 'faq-3',
    question: 'Does Train store my passkey or any secrets?',
    answer:
      "No. Your initial key and swap secrets are computed locally and kept in your browser cache. Your passkey stays securely in your device hardware. Train only ever receives the public hash that your funds are locked against — nothing on our servers could reveal your keys.",
  },
  {
    id: 'faq-4',
    question: 'What if I refresh the page or clear my cache mid-swap?',
    answer:
      "Your swap stays safe. Each swap's secret is derived from your initial key plus public details stored on the blockchain. If you clear your cache, simply logging in again with your passkey produces the exact same initial key, which recovers the same secret — so you can pick up any swap where you left off.",
  },
  {
    id: 'faq-5',
    question: 'What is a passkey?',
    answer:
      "A passkey is a modern, phishing-resistant way to sign in. It's a key pair where the private part is locked inside your device's secure hardware (Face ID, Touch ID, Windows Hello, Android biometrics, or a security key like a YubiKey). You approve each use with biometrics or a PIN, and the private key never leaves your device.",
  },
  {
    id: 'faq-6',
    question: 'Where is my passkey stored?',
    answer:
      "In your operating system or password manager — iCloud Keychain on Apple, Google Password Manager on Android, Windows Hello on Windows, or apps like 1Password and Dashlane. Train never sees the key itself, only a small label so you can pick which login to use.",
  },
  {
    id: 'faq-7',
    question: 'Can I use the same passkey on multiple devices?',
    answer:
      "Yes, if your passkey is synced through iCloud Keychain, Google Password Manager, 1Password, or similar. It shows up on your other signed-in devices and produces the same initial key, making your swap secrets recoverable everywhere. Hardware keys like a YubiKey aren't synced; you'd need to plug the same key into each device.",
  },
  {
    id: 'faq-8',
    question: 'What happens if I lose my device?',
    answer:
      "If your passkey is backed up by a service like iCloud or Google, just sign in on a new device once it syncs — your master key comes back with it, and your swaps are recoverable. If it's a hardware key with no backup, that login can't be recovered, so any in-flight swaps would need to wait for the HTLC timeout to refund. We recommend a synced passkey so you always have a way back in.",
  },
];

function PasskeyFAQContent() {
  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center pt-2 pb-6 shrink-0">
        <div className="w-20 h-20 rounded-3xl bg-secondary-500 flex items-center justify-center">
          <KeyRound className="w-12 h-12 text-primary-text" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-primary-text text-xl font-semibold">About logging in</p>
          <p className="text-secondary-text text-sm max-w-[320px]">
            Why Train needs a login, what it does, and how passkeys keep it secure.
          </p>
        </div>
      </div>
      <div className="max-h-[55svh] overflow-y-auto styled-scroll -mx-1 px-1">
        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-xl bg-secondary-500 hover:bg-secondary-400 transition-colors overflow-hidden"
            >
              <AccordionTrigger className="group flex items-center justify-between gap-3 py-4 px-3 text-left">
                <span className="text-sm font-medium text-primary-text">{item.question}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-secondary-text transition-transform duration-200 group-aria-expanded:rotate-180"
                  strokeWidth={2}
                />
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-3 pb-3 text-sm text-secondary-text leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="text-xs text-secondary-text text-center mt-4">
          Want the technical details?{' '}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-text underline hover:text-primary transition-colors"
          >
            Read the docs
          </a>
        </p>
      </div>
    </>
  );
}

interface PasskeyFAQModalProps {
  open: boolean;
  onClose: () => void;
}

export function PasskeyFAQModal({ open, onClose }: PasskeyFAQModalProps) {
  const { isMobile } = useWindowDimensions();

  if (isMobile) {
    return (
      <VaulDrawer
        show={open}
        setShow={(show) => { if (!show) onClose(); }}
        modalId="passkey-faq"
        mode="fitHeight"
      >
        <VaulDrawer.Snap id="item-1" openFullHeight className="h-full">
          <div className="px-4 pb-4">
            <PasskeyFAQContent />
          </div>
        </VaulDrawer.Snap>
      </VaulDrawer>
    );
  }

  return (
    <AppShellDialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
    >
      <PasskeyFAQContent />
    </AppShellDialog>
  );
}
