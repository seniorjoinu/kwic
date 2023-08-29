import { logout, isAuthorized, metamaskAddress } from "../../api"
import { bytesToHex } from "../../utils/encode";
import logoutIcon from '../../../assets/logout.svg';
import kwicLogoIcon from '../../../assets/kwic-logo.svg';
import './index.scss';

export function Header() {
    const logoutWidget = () => {
        if (isAuthorized) {
            const addressHex = bytesToHex(metamaskAddress);
            const address = `0x${addressHex.slice(0, 6)}...${addressHex.slice(34)}`;

            return (
                <div class="authorized">
                    <p>{address}</p>
                    <button onClick={() => logout()}><img src={logoutIcon} /><span>Log out</span></button>
                </div>
            )
        }

        return <div class="authorized" />;
    }

    return (
        <nav class="header">
            <img src={kwicLogoIcon} />
            {logoutWidget()}
        </nav>
    )
}