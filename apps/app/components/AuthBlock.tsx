import { UserStatusMenu } from "@/components/SecretDerivation/UserStatus"
import { WalletsMenu } from "@/components/Wallet/ConnectedWallets"

const AuthBlock = ({ onLogin, onViewLoginStatus }: { onLogin?: () => void; onViewLoginStatus?: () => void }) => {
    return (
        <div className="rounded-xl bg-secondary-500 p-2 flex flex-col gap-2">
            <UserStatusMenu onLogin={onLogin} onViewLoginStatus={onViewLoginStatus} />
            <WalletsMenu />
        </div>
    )
}

export default AuthBlock
