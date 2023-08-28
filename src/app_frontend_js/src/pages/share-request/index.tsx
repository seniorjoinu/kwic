import { createEffect, createSignal } from "solid-js";
import { krakozhiaPassportSchema } from "../../data";
import { createEventSignal } from "@solid-primitives/event-listener";
import { IKeyTree } from "../../utils/crypto";
import { useNavigate } from "@solidjs/router";
import "./index.scss";
import { authorize } from "../../api";

export interface IShareDataRequest {
    keys: IKeyTree;
}

export let shareDataRequest: IShareDataRequest | null = null;
export let parentWindow: MessageEventSource | null = null;

function ShareRequest(props: IShareDataRequest) {
    let keys = Object.keys(props.keys).map(key => <li>{krakozhiaPassportSchema().content[key].name}</li>);

    return (
        <div class="request">
            <ul>
                {keys}
            </ul>
            <p>from "<span>{krakozhiaPassportSchema().schemaName}</span>" document</p>
        </div>
    )
}

export function ShareRequestPage() {
    const message = createEventSignal(window, "message");
    const [request, setRequest] = createSignal<IShareDataRequest | null>(null);
    const navigate = useNavigate();
    const [wait, setWait] = createSignal(false);

    createEffect(() => {
        const msg = message();

        if (!msg) {
            return;
        }

        const msgUrl = new URL(msg.origin);
        const referrerUrl = new URL(document.referrer);

        if (msgUrl.host !== referrerUrl.host) {
            return;
        }

        shareDataRequest = JSON.parse(msg.data);
        parentWindow = msg.source;

        setRequest(shareDataRequest);
    }, message());

    const handleBtnClick = async () => {
        setWait(true);
        await authorize();
        setWait(false);

        navigate("/my-documents");
    };

    const body = () => {
        if (document.referrer) {
            const referrer = new URL(document.referrer);

            return (
                <>
                    <h2>Website <span>{referrer.host}</span> wants to know your:</h2>
                    {request() && <ShareRequest {...request()!} />}
                    <button disabled={wait()} onClick={handleBtnClick}>Continue</button>
                </>
            );
        } else {
            return <h2>404</h2>;
        }
    }

    return (
        <main style={{ cursor: wait() ? "wait" : "default" }} class="share-request">
            {body()}
        </main>
    );
}