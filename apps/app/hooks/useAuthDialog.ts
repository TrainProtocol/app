import { useCallback } from 'react'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import { useLoginModalStore } from '@/stores/loginModalStore'
import { useAppDialogueStore } from '@/stores/appDialogueStore'

/** Desktop → centered AppDialogue. Mobile → existing Vaul-based modal / drawer.
 *  openUserStatus takes a mobile-drawer opener because the mobile UserStatus drawer uses local state,
 *  not a shared store. */
export function useAuthDialog() {
    const { isMobile } = useWindowDimensions()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const openDialogue = useAppDialogueStore((s) => s.open)

    const openLogin = useCallback(() => {
        if (isMobile) openLoginModal()
        else openDialogue('login')
    }, [isMobile, openLoginModal, openDialogue])

    const openUserStatus = useCallback((openMobileDrawer: () => void) => {
        if (isMobile) openMobileDrawer()
        else openDialogue('userStatus')
    }, [isMobile, openDialogue])

    return { openLogin, openUserStatus }
}
