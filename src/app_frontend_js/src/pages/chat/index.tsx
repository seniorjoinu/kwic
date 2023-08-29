import { createResource, createSignal, onMount } from "solid-js";
import { DigitalDocument } from "../../components/DigitalDocument";
import faceImg from '../../../assets/face.png';
import passportImg from '../../../assets/passport.jpg';
import { Header } from "../../components/Header/header";
import "./index.scss";
import chatAvatar from '../../../assets/chat-avatar.png';
import smileIcon from '../../../assets/smile.svg';
import attachIcon from '../../../assets/attach.svg';
import sendArrowIcon from '../../../assets/send-arrow.svg';
import { CHAT, IChatMessage, USERNAME, krakozhiaSigner } from "../../utils/data";

const TheirAvatar = () => (
    <div class="avatar their">
        <img src={chatAvatar} />
    </div>
)

const MyAvatar = () => (
    <div class="avatar mine">
        VN
    </div>
)

function ChatMessage(props: IChatMessage) {
    let content;

    switch (typeof props.content) {
        case "string":
            content = <p class="text">{props.content}</p>;
            break;

        case "object":
            if (Array.isArray(props.content)) {
                content = <>
                    <img class="attachment" src={faceImg} alt="face" />
                    <img class="attachment" src={passportImg} alt="face" />
                </>;
            } else {
                content = <DigitalDocument {...props.content} />
            }
            break;

        default:
            throw new Error("Bad props");
    }

    const classNames = props.from == USERNAME ? "msg mine" : "msg their";
    const avatar = props.from == USERNAME ? <MyAvatar /> : <TheirAvatar />;
    const tail = (
        <svg class="tail" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M20 20C8.9543 20 0 11.0457 0 0V20H20Z" fill="#F7F8FA" />
        </svg>
    );

    return (
        <div class={classNames}>
            {avatar}
            <div class="bubble">
                {tail}
                <div class="content">
                    <div class="msg-header">
                        <span class="from">{props.from}</span>
                        {content}
                    </div>
                    <span class="datetime">{props.datetime}</span>
                </div>
            </div>
        </div>
    )
}

export function ChatPage() {
    const [chat] = createResource(CHAT);
    const [step, setStep] = createSignal(0);
    const [hasAttachments, setHasAttachments] = createSignal(false);

    onMount(() => {
        document.title = "Kwic";
    });

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

    const attachments = () => {
        if (hasAttachments()) {
            return <span>2 Attachments</span>
        } else {
            return undefined;
        }
    };

    const currentMsgContent = () => {
        const msg = currentMsg();

        switch (typeof msg) {
            case "string": {
                setHasAttachments(false);
                return <p class="msg text">{msg}</p>;
            }
            case "object": {
                if (Array.isArray(msg)) {
                    setHasAttachments(true);
                    const imgs = msg.map(it => (
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="21" viewBox="0 0 19 21" fill="none">
                                <path d="M18.669 5.83404C18.6709 6.53481 18.5338 7.229 18.2656 7.87644C17.9975 8.52387 17.6036 9.11169 17.1067 9.60588L7.4988 19.3278C7.12705 19.7002 6.6854 19.9954 6.19922 20.1965C5.71304 20.3977 5.19191 20.5008 4.66576 20.5C4.14064 20.5009 3.62051 20.398 3.13525 20.1973C2.64999 19.9966 2.20915 19.702 1.83805 19.3305C1.089 18.5797 0.668346 17.5624 0.668346 16.5018C0.668346 15.4412 1.089 14.4239 1.83805 13.6731L8.77897 6.7715C9.82111 5.73603 11.4773 5.70203 12.4728 6.69616C12.7138 6.93799 12.9022 7.22697 13.0264 7.545C13.1505 7.86303 13.2077 8.20327 13.1942 8.5444C13.1723 9.23846 12.8852 9.89774 12.3921 10.3866L5.80525 16.9735C5.68022 17.0985 5.51066 17.1688 5.33385 17.1688C5.15704 17.1688 4.98748 17.0985 4.86245 16.9735C4.73743 16.8485 4.66719 16.6789 4.66719 16.5021C4.66719 16.3253 4.73743 16.1558 4.86245 16.0307L11.4493 9.44386C11.7047 9.18849 11.8514 8.85511 11.8614 8.50506C11.8687 8.34567 11.843 8.18648 11.786 8.03746C11.729 7.88843 11.6418 7.75277 11.53 7.63895C11.0533 7.16422 10.2412 7.19822 9.71977 7.71696L2.77951 14.6172C2.28072 15.1179 2.00077 15.796 2.00102 16.5027C2.00127 17.2095 2.2817 17.8873 2.78084 18.3877C3.28153 18.8869 3.95972 19.1673 4.66676 19.1673C5.3738 19.1673 6.05199 18.8869 6.55268 18.3877L16.1606 8.66575C16.9194 7.90699 17.3354 6.90285 17.3354 5.83404C17.3354 4.76523 16.9194 3.7611 16.164 3.00567C15.4079 2.24957 14.4037 1.83351 13.3349 1.83351C12.2661 1.83351 11.262 2.24957 10.5059 3.00567L1.13662 12.3082C1.07446 12.3699 1.00075 12.4188 0.919708 12.452C0.838667 12.4852 0.75188 12.5021 0.664302 12.5017C0.487432 12.501 0.318079 12.4301 0.193499 12.3046C0.0689191 12.179 -0.000682677 12.0091 5.04841e-06 11.8322C0.000692773 11.6554 0.0716137 11.486 0.197166 11.3614L9.56508 2.06087C10.5705 1.05474 11.9101 0.5 13.3349 0.5C14.7598 0.5 16.0993 1.05474 17.1067 2.06287C17.6036 2.55689 17.9976 3.14459 18.2657 3.79192C18.5339 4.43926 18.6709 5.13337 18.669 5.83404Z" fill="#476FFE" />
                            </svg>
                            {it}
                        </span>
                    ));

                    return <div class="msg attachments">{imgs}</div>;
                }
            }
            default: {
                setHasAttachments(false);
            }
        }
    }

    return (
        <main class="chat">
            <div class="bg" />

            <Header />

            <div class="modal">
                <div class="chat-header">
                    <TheirAvatar />
                    <div class="info">
                        <h3>{krakozhiaSigner.name}</h3>

                        <div class="online">
                            <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 6 6" fill="none">
                                <circle cx="3" cy="3" r="3" fill="#1DCE00" />
                            </svg>
                            Online
                        </div>
                    </div>

                </div>
                <div class="chat-window">
                    {messages()}

                    <div class="controls">
                        {currentMsgContent()}
                        <div class="panel">
                            <div class="additional">
                                <img src={smileIcon} />
                                <img src={attachIcon} />
                                {attachments()}
                            </div>
                            <button disabled={currentMsg() === ""} onClick={handleBtn}>Send <img src={sendArrowIcon} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}