import { createEffect, createMemo, createResource, createSignal } from "solid-js"
import { CHAT, IChatMessage, USERNAME, krakozhiaWitness } from "../../data"
import { DigitalDocument } from "../../components/DigitalDocument";
import faceImg from '../../../assets/face.webp';
import passportImg from '../../../assets/passport.jpg';
import { Header } from "../../components/Header/header";
import "./index.scss";


function ChatMessage(props: IChatMessage) {
    let content;

    switch (typeof props.content) {
        case "string":
            content = <p>{props.content}</p>;
            break;

        case "object":
            if (Array.isArray(props.content)) {
                content = <>
                    <img src={faceImg} alt="face" />
                    <img src={passportImg} alt="face" />
                </>;
            } else {
                content = <DigitalDocument {...props.content} />
            }
            break;

        default:
            throw new Error("Bad props");
    }

    return (
        <div>
            <span class="from">{props.from}</span>
            {content}
            <span class="datetime">{props.datetime}</span>
        </div>
    )
}

export function ChatPage() {
    const [chat] = createResource(CHAT);
    const [step, setStep] = createSignal(0);

    const currentMsg = () => {
        const c = chat();
        if (!c) { return; }

        const s = step();

        if (s < c.length) {
            return c[step()].content;
        } else {
            return "";
        }
    };

    const messages = () => {
        const c = chat();
        if (!c) { return; }

        return c.slice(0, step()).map(it => <ChatMessage {...it} />);
    }

    const handleBtn = () => {
        const c = chat();
        if (!c) { return; }

        let s = step();
        s++;

        if (s === c.length) {
            setStep(s);

            return;
        }

        while (true) {
            if (s == c.length) {
                break;
            }

            if (c[s].from == USERNAME) {
                break;
            }

            s++;
        }

        setStep(s);
    }

    return (
        <main class="chat">
            <Header />
            <h3>{krakozhiaWitness().name}</h3>
            <div id="chat-window">
                {messages()}
            </div>
            <div id="controls">
                <textarea value={currentMsg() as string} cols="30" rows="5" />
                <button disabled={currentMsg() === ""} onClick={handleBtn}>Send</button>
            </div>
        </main>
    )
}