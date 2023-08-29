import { IShareDataRequest } from "../../pages/share-request";
import { HashTree, IDocumentProof } from "../crypto";

export type TKwicMessageType = 'proofRequest' | 'proof';

export interface IKwicMessage {
    domain: 'kwic';
    type: TKwicMessageType;
    payload: IShareDataRequest | IDocumentProof;
}

export const filterKwicMessage = (e: MessageEvent | null, type: TKwicMessageType): IKwicMessage | null => {
    if (!e) {
        return null;
    }

    const eventOrigin = new URL(e.origin);

    if (eventOrigin.host != window.location.host) {
        return null;
    }

    if (!e.data.hasOwnProperty('domain') || !e.data.hasOwnProperty('type') || !e.data.hasOwnProperty('payload')) {
        return null;
    }

    const data = e.data as IKwicMessage;

    if (data.domain !== "kwic" || data.type !== type) {
        return null;
    }


    if (type == "proofRequest") {
        if (!data.payload.hasOwnProperty('keys')) {
            return null;
        }
    }

    if (type == "proof") {
        if (!data.payload.hasOwnProperty('witness') || !data.payload.hasOwnProperty('signatureHex')) {
            return null;
        }
    }

    return data;
}