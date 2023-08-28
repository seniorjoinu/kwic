import { metamaskAddress } from "../../api"
import { hexEncode } from "../../utils/encode";
import './index.scss';

export function Header() {
    const addressHex = hexEncode(metamaskAddress);
    const address = `0x${addressHex.slice(0, 6)}...${addressHex.slice(34)}`;

    return (
        <nav class="header">
            {address}
        </nav>
    )
}