import { createEffect, createSignal, onMount } from "solid-js";
import { IShareDataRequest } from "../share-request";
import { JSONToProof } from "../../utils/encode";
import bg from '../../../assets/airport.png';
import logo from '../../../assets/logo.svg';
import checkmark from '../../../assets/check.svg';
import ticketsPng from '../../../assets/tickets.png';
import './index.scss';
import { IDocumentProof, verifyDocumentProof } from "../../utils/crypto/merkalized-documents";
import { calculateAge, now, toDateString } from "../../utils/time";
import { IKwicMessage, filterKwicMessage } from "../../utils/data/messages";

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
    const [fields, setFields] = createSignal<IPassportFields | null>(null);
    const [modalVisible, setModalVisible] = createSignal(false);

    onMount(() => {
        document.title = "Krakozhia Airlines";
    });

    const handleBtn = () => {
        const f = fields();

        if (f) {
            setModalVisible(true);
            return;
        }

        setBlocked(true);
        const w = window.open('/request', "_blank");

        if (w === null) {
            throw new Error("Something went wrong");
        }

        window.addEventListener("message", handleMessage);

        const msg: IKwicMessage = {
            domain: 'kwic',
            type: 'proofRequest',
            payload: shareRequest
        };

        setTimeout(() => w.postMessage(msg), 1000);
    };

    const handleMessage = async (e: MessageEvent | null) => {
        const proofMsg = filterKwicMessage(e, 'proof');

        if (!proofMsg) {
            return;
        }

        const proof = proofMsg.payload as IDocumentProof;
        // @ts-expect-error
        const fields = (await verifyDocumentProof(proof, shareRequest)) as unknown as IPassportFields;

        setFields(fields);
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

                    <div class="fields">
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
                    </div>

                    <div class="divider" />

                    <div class="verified">
                        <img src={checkmark} /> <p>Signature verified</p>
                    </div>
                </div>
            )
        }
    }

    const btn = () => {
        return <button disabled={blocked()} onClick={handleBtn}>Book Tickets</button>;
    }

    const modal = () => {
        if (modalVisible()) {
            return (
                <div class="modal-wrapper">
                    <div class="modal">
                        <img src={checkmark} />
                        <div class="text">
                            <h3><span>Your tickets are ready</span></h3>
                            <p>Have a safe flight!</p>
                        </div>
                    </div>
                </div>
            )
        } else {
            return undefined;
        }
    }

    return (
        <main class="airlines">
            <img class="logo" src={logo} />

            <div class="form">
                <div class="route">
                    <div class="waypoint from">
                        <span>Departure</span>
                        <div class="input"><span class="city">Homel</span><span class="airport">HML</span></div>
                    </div>
                    <div class="waypoint to">
                        <span>Destination</span>
                        <div class="input"><span class="city">New York</span><span class="airport">JFK</span></div>
                    </div>
                </div>

                <div class="controls">
                    <div class="field date">
                        <span>Date</span>
                        <div class="input">18 June 2004</div>
                    </div>
                    <div class="field time">
                        <span>Time</span>
                        <div class="input">12:00</div>
                    </div>
                    <div class="field seat">
                        <span>Seat</span>
                        <div class="input">57A</div>
                    </div>
                </div>
            </div>


            {btn()}

            {passenger()}

            {modal()}
        </main>
    );
}