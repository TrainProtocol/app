"use client"

import { ChevronDown, Fingerprint } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from '@/components/shadcn/accordion';
import AppShellDialog from '@/components/shared/AppShellDialog';
import VaulDrawer from '@/components/Modal/vaulModal';
import useWindowDimensions from '@/hooks/useWindowDimensions';

const FAQ_ITEMS: { id: string; question: string; answer: string }[] = [
  {
    id: 'faq-1',
    question: 'What is a passkey?',
    answer:
      "A passkey is a modern way to sign in using your device's built-in security — like Face ID, Touch ID, Windows Hello, or your phone's fingerprint sensor. Instead of a password you have to remember, your device proves it's you with a unique cryptographic key that's created and protected on the device itself.",
  },
  {
    id: 'faq-2',
    question: 'Why does Train use passkeys?',
    answer:
      "Every Train swap is locked with a one-time secret. Your passkey is what generates that secret and re-creates it later to unlock your funds — so you don't need to remember a password, write down a backup phrase, or trust anyone to hold a key for you. A quick fingerprint or face scan is all it takes to authorize a swap.",
  },
  {
    id: 'faq-3',
    question: 'Does Train ever see my passkey or my swap secret?',
    answer:
      "No. Your passkey stays sealed inside your device's secure store, and your swap secret is generated locally only when it's needed. The only thing Train sees is a public fingerprint of that secret (called the hashlock), which is what your funds are locked against on-chain. The fingerprint can't be reversed back into the secret.",
  },
  {
    id: 'faq-4',
    question: 'How is a passkey different from a password?',
    answer:
      "You can't forget a passkey, type it into the wrong site, or have it leaked from a database. It's tied to your device and unlocked with biometrics, which makes it far harder to phish, guess, or reuse against you than any password — even a strong one.",
  },
  {
    id: 'faq-5',
    question: 'Where is my passkey stored?',
    answer:
      "Your passkey is stored by your operating system or password manager — for example iCloud Keychain on Apple, Google Password Manager on Android, Windows Hello, or apps like 1Password and Dashlane. The actual key material is kept inside that secure store and is never exposed to Train or any website you visit.",
  },
  {
    id: 'faq-6',
    question: 'Can I use the same passkey on multiple devices?',
    answer:
      "Yes, if your passkey is synced through a service like iCloud Keychain, Google Password Manager, or 1Password — it'll appear automatically on your other signed-in devices. Hardware security keys (like a YubiKey) stay on the physical key itself and aren't synced; you'd plug the same key into each device you want to use.",
  },
  {
    id: 'faq-7',
    question: 'What happens if I lose my device?',
    answer:
      "If your passkey is synced through a cloud-backed password manager (iCloud, Google, 1Password, etc.), you can sign in again on a new device once it syncs over. If it isn't synced — for example a hardware security key with no backup — that passkey can't be recovered and you'd need to create a new one. We recommend using a synced passkey so you always have a way back in.",
  },
  {
    id: 'faq-8',
    question: 'Is a passkey safer than a password?',
    answer:
      "In almost every way, yes. Passkeys can't be phished (they only work on the real Train site), can't be reused on a fake page, and can't be stolen from a database since the secret part never leaves your device. They also require your face, fingerprint, or device PIN to use — so even someone with your unlocked computer would have a hard time signing in as you.",
  },
];

function PasskeyFAQContent() {
  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center pt-2 pb-6 shrink-0">
        <div className="w-20 h-20 rounded-3xl bg-secondary-500 flex items-center justify-center">
          <Fingerprint className="w-12 h-12 text-primary-text" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-primary-text text-xl font-semibold">Passkey FAQ</p>
          <p className="text-secondary-text text-sm max-w-[320px]">
            Common questions about how passkeys work and how to use them.
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
                <div className="px-3 pb-3 text-sm text-secondary-text leading-relaxed">
                  {item.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
