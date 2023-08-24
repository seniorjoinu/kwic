import { krakozhiaPassportSchema } from "../../data";
import { IKeyTree } from "../../utils/crypto";

export interface IShareDataRequest {
    keys: IKeyTree;
}

export let shareDataRequest: IShareDataRequest | null = null;

window.addEventListener("message", (e) => {
    if (e.origin !== document.referrer) {
        return;
    }

    shareDataRequest = JSON.parse(e.data);
}, false);

function ShareRequest(props: IShareDataRequest) {
    let keys = Object.keys(props.keys).map(key => <li>krakozhiaPassportSchema().content[key].name</li>);

    return (
        <>
            <ul>
                {keys}
            </ul>
            <p>from "{krakozhiaPassportSchema().schemaName}" document</p>
        </>
    )
}

export function ShareRequestPage() {
    let body;
    if (document.referrer) {
        body = (
            <>
                <h2>Site {document.referrer} wants to know your</h2>
                {shareDataRequest && <ShareRequest {...shareDataRequest} />}
            </>
        );
    } else {
        body = <h2>404</h2>;
    };

    return <main>{body}</main>;
}