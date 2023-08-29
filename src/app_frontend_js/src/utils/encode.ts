import { HashTree, IDocumentProof } from "./crypto";
import { TPrimitiveType } from "./data";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// encodes a utf-8 string as bytes
export const strToBytes = (str: string): Uint8Array => textEncoder.encode(str);

// decodes a utf-8 string out of the provided bytes
export const bytesToStr = (bytes: Uint8Array): string => textDecoder.decode(bytes);

// encodes a byte array as hex string
export const bytesToHex = (bytes: Uint8Array): string =>
    bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

// decodes a byte array out of the hex string
export const hexToBytes = (hexString: string): Uint8Array => {
    const matches = hexString.match(/.{1,2}/g);

    if (matches == null) {
        throw new Error("Invalid hexstring");
    }

    return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
}

// encodes a supported primitive type (string, number or bool) to bytes 
export const primitiveToBytes = (data: TPrimitiveType): ArrayBuffer => {
    switch (typeof data) {
        case "string":
            return strToBytes(data);

        case "number":
            return numberToBytes(data);

        case "boolean":
            return booleanToBytes(data);

        default:
            throw new Error("Unsupported type");
    }
}

// encodes IDocumentProof as JSON string
export const proofToJSON = (proof: IDocumentProof): string => {
    return JSON.stringify({ witness: proof.witness.toJSON(), signatureHex: proof.signatureHex })
}

// decodes an IDocumentProof from JSON string
export const JSONToProof = (json: string): IDocumentProof => {
    const p = JSON.parse(json);

    return {
        witness: HashTree.fromJSON(p.witness),
        signatureHex: p.signatureHex,
    };
}

function booleanToBytes(b: boolean): Uint8Array {
    if (b) {
        return new Uint8Array([1]);
    } else {
        return new Uint8Array([0]);
    }
}

function numToUint8Array(num: number) {
    let arr = new Uint8Array(8);

    for (let i = 0; i < 8; i++) {
        arr[i] = num % 256;
        num = Math.floor(num / 256);
    }

    return arr;
}

function numberToBytes(n: number): Uint8Array {
    if (Number.isNaN(n)) {
        throw new Error("The number is NaN");
    }

    if (!Number.isInteger(n)) {
        throw new Error("Floats are not supported");
    }

    return numToUint8Array(n);
}