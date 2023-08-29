import { Ed25519KeyIdentity } from "@dfinity/identity";
import { bytesToHex, hexToBytes } from "./encode";

const LOCAL_STORAGE_KEY_AES = "kwic-aes-key";
const LOCAL_STORAGE_KEY_ADDRESS = "kwic-metamask-addr";
const LOCAL_STORAGE_KEY_IDENTITY = "kwic-identity";

export const retrieveAesKey = (): Uint8Array | null => {
    const k = localStorage.getItem(LOCAL_STORAGE_KEY_AES);

    if (k === null) {
        return null;
    }

    return hexToBytes(k);
}

export const retrieveMetamaskAddress = (): Uint8Array | null => {
    const k = localStorage.getItem(LOCAL_STORAGE_KEY_ADDRESS);

    if (k === null) {
        return null;
    }

    return hexToBytes(k);
}

export const retrieveIcIdentity = (): Ed25519KeyIdentity | null => {
    const k = localStorage.getItem(LOCAL_STORAGE_KEY_IDENTITY);

    if (k === null) {
        return null;
    }

    return Ed25519KeyIdentity.fromJSON(k);
}

export const storeAesKey = (key: Uint8Array) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_AES, bytesToHex(key));
}

export const storeMetamaskAddress = (addr: Uint8Array) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_ADDRESS, bytesToHex(addr));
}

export const storeIcIdentity = (identity: Ed25519KeyIdentity) => {
    localStorage.setItem(LOCAL_STORAGE_KEY_IDENTITY, JSON.stringify(identity.toJSON()));
}

export const clearAesKey = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_AES);
}

export const clearMetamaskAddress = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_ADDRESS);
}

export const clearIcIdentity = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_IDENTITY);
}