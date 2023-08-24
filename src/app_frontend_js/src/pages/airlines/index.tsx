import { createSignal } from "solid-js";
import { IShareDataRequest } from "../share-request";
import { JSONToProof } from "../../utils/crypto";
import { Signature, SigningKey } from "ethers";
import { krakozhiaWitness } from "../../data";

const shareRequest: IShareDataRequest = {
    keys: {
        firstName: null,
        lastName: null,
        dateOfBirth: null,
    }
};

export function AirlinesPage() {
    const [blocked, setBlocked] = createSignal(false);

    const handleBtn = () => {
        setBlocked(true);
        const w = window.open('http://kwic.localhost/request', "_blank");

        if (w === null) {
            throw new Error("Something went wrong");
        }


        w.addEventListener('message', handleMessage, false);
        w.postMessage(JSON.stringify(shareRequest));
    };

    const handleMessage = async (e: MessageEvent) => {
        const proof = JSONToProof(e.data);
        const gatheredFields = proof.witness.toDocument();

        console.log('gathered fields', gatheredFields);

        // TODO: check if returned keys are the same as requested

        const rootHash = await proof.witness.reconstruct();

        const signature = Signature.from(proof.signatureHex);
        const pubkey = SigningKey.recoverPublicKey(new Uint8Array(rootHash), signature);

        if (pubkey !== krakozhiaWitness().signingKey.publicKey) {
            alert("Invalid signature");
            return;
        }

        console.log("Signature verified");
    };

    return (
        <main>
            <h1>Krakozhia Airlines</h1>
            <div class="route">
                <div class="city">
                    <span>Departure</span>
                    <select>
                        <option selected value="hml">Homel (HML)</option>
                    </select>
                </div>
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
                    <select>
                        <option selected value="day">18</option>
                    </select>
                    <select>
                        <option selected value="month">June</option>
                    </select>
                    <select>
                        <option selected value="year">2004</option>
                    </select>
                </div>
                <div class="time">
                    <span>Time</span>
                    <select>
                        <option selected value="hours">12</option>
                    </select>
                    <select>
                        <option selected value="minutes">00</option>
                    </select>
                </div>
                <div class="seat">
                    <span>Seat</span>
                    <select>
                        <option selected value="seat">57A</option>
                    </select>
                </div>
            </div>

            <button disabled={blocked()} onClick={handleBtn}>Buy</button>
        </main>
    );
}