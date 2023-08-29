import { ActorSubclass, HttpAgent, Actor, Identity } from '@dfinity/agent';
import type { _SERVICE as BackendService } from 'declarations/app_backend.did';
// @ts-expect-error
import { idlFactory } from 'declarations/app_backend.did';
import { BrowserProvider, keccak256, ethers, computeAddress, id, recoverAddress, hashMessage } from 'ethers';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import * as vetkd from 'vetkd';
import { aesGcmDecrypt, aesGcmEncrypt } from '../utils/crypto';
import { bytesToHex, bytesToStr, hexToBytes, strToBytes } from '../utils/encode';
import { ISignedDocument } from '../utils/data';
import { clearAesKey, clearMetamaskAddress, retrieveAesKey, retrieveIcIdentity, retrieveMetamaskAddress, storeAesKey, storeIcIdentity, storeMetamaskAddress } from '../utils/local-storage';



// @ts-expect-error
const provider = new BrowserProvider(window.ethereum);
const backendCanisterId: string = import.meta.env.VITE_CANISTER_ID_APP_BACKEND;
const icAgent = new HttpAgent({ identity: getIdentity(), host: 'http://localhost:39395' });
const backend: ActorSubclass<BackendService> = createActor(backendCanisterId, icAgent);

export let isAuthorized = false;
export let aesRawKey: Uint8Array | null = null;
// this address is calculated in a not compatible with metamask way, 
// so it won't be the same as the one metamask shows us
// I was unable to find a rust library that compiles to wasm and produces correct addresses form pubkeys
// this one is also fine from security POW though
export let metamaskAddress: Uint8Array | null = null;

export function logout() {
    isAuthorized = false;
    aesRawKey = null;
    metamaskAddress = null;

    clearAesKey();
    clearMetamaskAddress();
    clearMetamaskAddress();

    window.location.reload();
}

export async function login() {
    if (isAuthorized) {
        return;
    }

    const prevAesKey = retrieveAesKey();
    const prevAddress = retrieveMetamaskAddress();

    if (prevAesKey == null || prevAddress == null) {
        console.log("Previous authorization not found, creating a new one");

        const addrs = await provider.send('eth_requestAccounts', []);
        console.log('their addr:', addrs[0]);

        const [signature, address] = await signSessionPrincipalAndDeriveAddress(addrs[0]);

        await backend.authorize(signature);

        metamaskAddress = address;
        aesRawKey = await getAes256GcmKey();

        storeAesKey(aesRawKey);
        storeMetamaskAddress(metamaskAddress);
    } else {
        console.log("Found previous authorization");

        metamaskAddress = prevAddress;
        aesRawKey = prevAesKey;
    }

    isAuthorized = true;
    console.log("Authorization success! Encryption key is ready.");
}

async function signSessionPrincipalAndDeriveAddress(signerAddress: string): Promise<[Uint8Array, Uint8Array]> {
    const signer = await provider.getSigner(signerAddress);
    const principal = await icAgent.getPrincipal();

    const msg = `Log in as ${principal.toText()}`;

    const hexPrincipalHash: string = hashMessage(msg);
    const hexSignature: string = await signer.signMessage(msg);
    const hexPubkey: string = ethers.SigningKey.recoverPublicKey(hexPrincipalHash, hexSignature);

    const hexPubkeyHash: string = keccak256(hexToBytes(hexPubkey.slice(4)));
    const signature = hexToBytes(hexSignature.slice(2));
    const metamaskAddr = hexToBytes(hexPubkeyHash.slice(2)).slice(12);

    return [signature, metamaskAddr];
}

function getIdentity(): Identity {
    const prevIdentity = retrieveIcIdentity();

    if (prevIdentity !== null) {
        console.log("Previous identity found.")

        return prevIdentity;
    }

    console.log("Previous identity not found, creating a new one");

    const identity = Ed25519KeyIdentity.generate();
    storeIcIdentity(identity);

    return identity;
}

export async function storeDocument(document: ISignedDocument) {
    if (aesRawKey == null) {
        await login();
    }

    const docBytes = await aesGcmEncrypt(strToBytes(JSON.stringify(document)), aesRawKey!);

    await backend.store_encrypted_document(docBytes);
}

export async function listMyDocuments(): Promise<ISignedDocument[]> {
    if (aesRawKey == null) {
        await login();
    }

    const encryptedDocuments: Uint8Array[] = (await backend.list_my_documents()) as Uint8Array[];
    const decryptedDocuments = await Promise.all(encryptedDocuments.map(it => aesGcmDecrypt(it, aesRawKey!)));

    return decryptedDocuments.map(it => JSON.parse(bytesToStr(new Uint8Array(it))));
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