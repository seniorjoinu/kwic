import { ActorSubclass, HttpAgent, SignIdentity, hash } from '@dfinity/agent';
import { createActor } from '../../../declarations/app_backend';
import type { _SERVICE as BackendService } from '../../../declarations/app_backend/app_backend.did';
import { BrowserProvider } from 'ethers';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import MerkleTree, { Proof } from 'merkle-tools';

// @ts-expect-error
const provider = new BrowserProvider(window.ethereum);
const backendCanisterId: string = import.meta.env.VITE_CANISTER_ID_APP_BACKEND;
const icAgent = new HttpAgent({ identity: Ed25519KeyIdentity.generate() });
const backend: ActorSubclass<BackendService> = createActor(backendCanisterId, { agent: icAgent });
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();


export let isAuthorized = false;

export async function authorize() {
    if (isAuthorized) {
        return;
    }

    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const principal = await icAgent.getPrincipal();

    const signature = await signer.signMessage(principal.toUint8Array());

    await backend.authorize(signature);

    isAuthorized = true;
}

export async function storeEncryptedDocument(document: string) {
    const docBytes = textEncoder.encode(document);

    await backend.store_encrypted_document(docBytes);
}

export interface IDocument {
    [key: string]: IDocument | string | number;
}

function merkalizeDocument(doc: IDocument): MerkleTree {
    let result = new MerkleTree({ hashType: 'SHA256' });

    for (let key of Object.keys(doc).sort()) {
        const value = doc[key];

        if (typeof value == "string" || typeof value == "number") {
            result.addLeaf(`${key};;${value}`, true);

        } else if (typeof value == "object") {
            const tree = merkalizeDocument(value);
            const root = tree.getMerkleRoot();
            const v = textDecoder.decode(root);

            result.addLeaf(`${key};;${v}`, true);
        } else {
            throw new Error(`Invalid doc field type: doc - ${doc}, field - ${key}`);
        }
    }

    return result;
}

export interface IFieldWitness {
    path: string[];
    value: string | number;
    proof: Proof<string>;
}

export class Document {
    private merkleTree: MerkleTree;

    constructor(private obj: IDocument) {
        this.merkleTree = merkalizeDocument(obj);
    }

    public getRoot(): Uint8Array {
        return new Uint8Array([...this.merkleTree.getMerkleRoot()]);
    }

    public witness(...paths: string[][]): IFieldWitness[] {
        const result: IFieldWitness[] = [];

        for (let path of paths) {
            let obj = this.obj;
            let idx = 0;
            const witness: IFieldWitness = {};

            for (let step in path) {
                const sortedKeys = Object.keys(obj).sort();
                let merkleIdx = sortedKeys.findIndex(it => it == path[step]);

                if (merkleIdx === -1) {
                    throw new Error(`Invalid path: document ${obj} has no field ${path[step]}`);
                }

                merkleIdx
            }
        }
    }
}

export async function createDocument(doc: IDocument) {

}