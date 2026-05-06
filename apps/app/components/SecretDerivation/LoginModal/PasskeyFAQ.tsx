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
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    id: 'faq-2',
    question: 'How is a passkey different from a password?',
    answer:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'faq-3',
    question: 'Where is my passkey stored?',
    answer:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
  {
    id: 'faq-4',
    question: 'Can I use the same passkey on multiple devices?',
    answer:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
  },
  {
    id: 'faq-5',
    question: 'What happens if I lose my device?',
    answer:
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
  },
  {
    id: 'faq-6',
    question: 'Is a passkey safer than a password?',
    answer:
      'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.',
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
        header={<p>Passkey FAQ</p>}
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
      title="Passkey FAQ"
    >
      <PasskeyFAQContent />
    </AppShellDialog>
  );
}
