import { createEffect, createSignal, onMount } from "solid-js";
import { IShareDataRequest } from "../share-request";
import { JSONToProof } from "../../utils/crypto";
import { Signature, SigningKey } from "ethers";
import { calculateAge, krakozhiaWitness, now, toDateString, verifyDocumentRequest } from "../../data";
import bg from '../../../assets/airport.jpg';
import logo from '../../../assets/air-log.png';
import './index.scss';

const shareRequest: IShareDataRequest = {
    keys: {
        firstName: null,
        lastName: null,
        dateOfBirth: null,
    }
};

export interface IPassportFields {
    firstName: string;
    lastName: string;
    dateOfBirth: number;
}

export function AirlinesPage() {
    const [blocked, setBlocked] = createSignal(false);
    const [msg, setMsg] = createSignal<MessageEvent | null>(null);
    const [fields, setFields] = createSignal<IPassportFields | null>(null);

    onMount(() => {
        document.title = "Krakozhia Airlines";
    })

    const handleBtn = () => {
        const f = fields();

        if (f) {
            alert("Your tickets are ready! Have a great flight!");
            return;
        }

        setBlocked(true);
        const w = window.open('http://kwic.localhost:3000/request', "_blank");

        if (w === null) {
            throw new Error("Something went wrong");
        }

        window.addEventListener("message", setMsg);
        w.addEventListener("message", setMsg);

        const message = JSON.stringify(shareRequest);

        setTimeout(() => {
            w.postMessage(message, "*");

            console.log("message sent", message);
        }, 1000);
    };

    createEffect(() => {
        handleMessage(msg())
    }, msg());

    const handleMessage = async (e: MessageEvent | null) => {
        if (!e || e.origin !== 'http://kwic.localhost:3000') {
            return;
        }

        console.log('message received', e);

        const proof = JSONToProof(e.data);
        const gatheredFields = proof.witness.toDocument();

        console.log('gathered fields', gatheredFields);

        if (!verifyDocumentRequest(gatheredFields, shareRequest.keys)) {
            throw new Error("Invalid document");
        }

        const rootHash = await proof.witness.reconstruct();
        const signature = Signature.from(proof.signatureHex);
        const pubkey = SigningKey.recoverPublicKey(new Uint8Array(rootHash), signature);

        if (pubkey !== krakozhiaWitness().signingKey.publicKey) {
            throw new Error("Invalid signature");
        }

        console.log("Signature verified!");

        // @ts-expect-error
        setFields(gatheredFields as IPassportFields);

        setBlocked(false);
    };

    const passenger = () => {
        const f = fields();

        if (!f) {
            return undefined;
        } else {
            return (
                <div class="passenger">
                    <h2>Passenger</h2>

                    <div class="field">
                        <h4>First name</h4>
                        <span>{f.firstName}</span>
                    </div>

                    <div class="field">
                        <h4>Last name</h4>
                        <span>{f.lastName}</span>
                    </div>

                    <div class="field">
                        <h4>Date of birth</h4>
                        <span>{toDateString(new Date(f.dateOfBirth))} ({calculateAge(f.dateOfBirth, now.getTime())} years)</span>
                    </div>

                    <div class="verified">
                        <p><span>✔</span> Signature verified</p>
                    </div>
                </div>
            )
        }
    }

    const btn = () => {
        return <button disabled={blocked()} onClick={handleBtn}>Book tickets</button>;
    }

    return (
        <main class="airlines" style={{ "background-image": `url(${bg})` }}>
            <img class="logo" src={logo} />
            <div class="route">
                <div class="city">
                    <span>Departure</span>
                    <select>
                        <option selected value="hml">Homel (HML)</option>
                    </select>
                </div>
                <span class="arrow">→</span>
                <div class="city">
                    <span>Destination</span>
                    <select>
                        <option selected value="hml">New York (JFK)</option>
                    </select>
                </div>
            </div>

            <div class="controls">
                <div class="date">
                    <span>Date</span>
                    <div class="form">
                        <select>
                            <option selected value="day">18 June 2004</option>
                        </select>
                    </div>
                </div>
                <div class="time">
                    <span>Time</span>
                    <div class="form">
                        <select>
                            <option selected value="hours">12:00</option>
                        </select>
                    </div>
                </div>
                <div class="seat">
                    <span>Seat</span>
                    <div class="form">
                        <select>
                            <option selected value="seat">57A</option>
                        </select>
                    </div>
                </div>
            </div>

            {btn()}

            {passenger()}
        </main>
    );
}