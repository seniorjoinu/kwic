import { createEffect, createSignal, onMount } from "solid-js";
import { createEventSignal } from "@solid-primitives/event-listener";
import { useNavigate } from "@solidjs/router";
import "./index.scss";
import documentIcon from '../../../assets/document.svg';
import { login } from "../../api";
import { Header } from "../../components/Header/header";
import { IProofRequest } from "../../utils/crypto";
import { krakozhiaPassportSchema } from "../../utils/data";
import { filterKwicMessage } from "../../utils/data/messages";

export interface IShareDataRequest {
    keys: IProofRequest;
}

export let shareDataRequest: IShareDataRequest | null = null;
export let parentWindow: MessageEventSource | null = null;

function ShareRequest(props: IShareDataRequest) {
    let keys = Object.keys(props.keys).map(key => <li>{krakozhiaPassportSchema().content[key].name}</li>);

    return (
        <>
            <ul class="fields">
                {keys}
            </ul>
            <div class="from">
                <h4>From</h4>
                <p><img src={documentIcon} />{krakozhiaPassportSchema().schemaName}</p>
            </div>
        </>
    )
}

export function ShareRequestPage() {
    const message = createEventSignal(window, "message");
    const [request, setRequest] = createSignal<IShareDataRequest | null>(null);
    const navigate = useNavigate();
    const [wait, setWait] = createSignal(false);

    const disabled = () => !request() || wait();

    onMount(() => {
        document.title = "Kwic";
    });

    createEffect(() => {
        const msg = message();

        const proofRequestMsg = filterKwicMessage(msg, 'proofRequest');

        if (!proofRequestMsg) {
            return;
        }

        parentWindow = msg.source;

        shareDataRequest = proofRequestMsg.payload as IShareDataRequest;
        setRequest(shareDataRequest);
    }, message());

    const handleBtnClick = async () => {
        setWait(true);
        await login();
        setWait(false);

        navigate("/my-documents");
    };

    const btn = () => {
        const text = disabled() ? "Wait" : "Continue";

        return (
            <button disabled={disabled()} onClick={handleBtnClick}>{text}</button>
        )
    }

    const body = () => {
        if (document.referrer) {
            return (
                <div class="modal">
                    <h2><span>Krakozhia Airlines</span> Wants to know your:</h2>
                    {request() && <ShareRequest {...request()!} />}
                    {btn()}
                </div>
            );
        } else {
            return <h2>404</h2>;
        }
    }

    return (
        <main style={{ cursor: disabled() ? "wait" : "default" }} class="share-request">
            <div class="bg" />
            <Header />
            {body()}
        </main>
    );
}