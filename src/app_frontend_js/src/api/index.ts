import { ActorSubclass, HttpAgent, Actor } from '@dfinity/agent';
import type { _SERVICE as BackendService } from 'declarations/app_backend.did';
// @ts-expect-error
import { idlFactory } from 'declarations/app_backend.did';
import { BrowserProvider, keccak256, ethers } from 'ethers';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import * as vetkd from 'vetkd';
import { aesGcmDecrypt, aesGcmEncrypt } from '../utils/crypto';
import { IDocument } from '../data';

export const WITNESS_PRIVKEY_HEX = '0x0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a';
export const WITNESS_PUBKEY_HEX = '0x04f76a39d05686e34a4420897e359371836145dd3973e3982568b60f8433adde6eb61f3694eae50e3815d4ed3068d5892f2571dc8f654271535e23b513dea6cbe3';

// @ts-expect-error
const provider = new BrowserProvider(window.ethereum);
const backendCanisterId: string = import.meta.env.VITE_CANISTER_ID_APP_BACKEND;
const icAgent = new HttpAgent({ identity: Ed25519KeyIdentity.generate(), host: 'http://localhost:40035' });
const backend: ActorSubclass<BackendService> = createActor(backendCanisterId, icAgent);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export let isAuthorized = false;
export let aesRawKey: Uint8Array | null = null;
export let metamaskAddress: Uint8Array | null = null;

export async function authorize() {
    if (isAuthorized) {
        return;
    }

    await provider.send('eth_requestAccounts', []);

    const signer = await provider.getSigner();
    const principal = await icAgent.getPrincipal();

    const principalHash = hexDecode(keccak256(principal.toUint8Array()).replace('0x', ''));
    const hexSignature = await signer.signMessage(principalHash);
    const signature = hexDecode(hexSignature.slice(2));

    await backend.authorize(signature);

    const pubkeyHash = keccak256(hexDecode(ethers.SigningKey.recoverPublicKey(principalHash, hexSignature).replace('0x', '')));

    metamaskAddress = hexDecode(pubkeyHash.replace('0x', '')).slice(12);
    aesRawKey = await getAes256GcmKey();
    isAuthorized = true;

    console.log("Authorization success. VET key is ready!");
}

export async function storeDocument(document: IDocument) {
    if (aesRawKey == null) {
        throw new Error("Not authorized");
    }

    const docBytes = await aesGcmEncrypt(textEncoder.encode(JSON.stringify(document)), aesRawKey!);

    await backend.store_encrypted_document(docBytes);
}

(window as any).storeDocument = storeDocument;

export async function listMyDocuments(): Promise<IDocument[]> {
    if (aesRawKey == null) {
        throw new Error("Not authorized");
    }

    // @ts-expect-error
    const encryptedDocuments: Uint8Array[] = await backend.list_my_documents();
    const decryptedDocuments = await Promise.all(encryptedDocuments.map(it => aesGcmDecrypt(it, aesRawKey!)));

    return decryptedDocuments.map(it => JSON.parse(textDecoder.decode(it)));
}

export async function getAes256GcmKey() {
    if (!metamaskAddress) {
        throw new Error("Authorize please");
    }

    const seed = window.crypto.getRandomValues(new Uint8Array(32));
    const tsk = new vetkd.TransportSecretKey(seed);

    const [ekBytes, pkBytes] = await Promise.all([backend.encrypted_symmetric_key_for_caller(tsk.public_key()), backend.symmetric_key_verification_key()]);

    return tsk.decrypt_and_hash(
        ekBytes as Uint8Array,
        pkBytes as Uint8Array,
        metamaskAddress,
        32,
        new TextEncoder().encode("aes-256-gcm")
    );
}

function createActor<T>(canisterId: string, agent: HttpAgent): ActorSubclass<T> {
    // Fetch root key for certificate validation during development
    if (import.meta.env.VITE_DFX_NETWORK !== "ic") {
        agent.fetchRootKey().catch((err) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running"
            );
            console.error(err);
        });
    }

    // Creates an actor with using the candid interface and the HttpAgent
    return Actor.createActor(idlFactory, {
        agent,
        canisterId,
    });
};

const hexDecode = (hexString: string) => {
    const matches = hexString.match(/.{1,2}/g);

    if (matches == null) {
        throw new Error("Invalid hexstring");
    }

    return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
}