import { hexDecode, hexEncode } from "../api";
import { IDocument, TPrimitiveType } from "../data";

export type Hash = ArrayBuffer;

const textEncoder = new TextEncoder();
const FORK_DOMAIN = domainSep('ic-hashtree-fork');
const LEAF_DOMAIN = domainSep('ic-hashtree-leaf');
const LABELED_DOMAIN = domainSep('ic-hashtree-labeled');
const EMPTY_DOMAIN = domainSep('ic-hashtree-empty');
const PRIMITIVE_TYPES = ["string", "number", "bigint", "boolean"];

function domainSep(domain: string): ArrayBuffer {
    return new Uint8Array([domain.length, ...textEncoder.encode(domain)]);
}

async function forkHash(l: Hash, r: Hash): Promise<Hash> {
    const buf = new Blob([FORK_DOMAIN, l, r]);

    return sha256(await buf.arrayBuffer());
}

async function leafHash(leaf: TPrimitiveType): Promise<Hash> {
    const buf = new Blob([LEAF_DOMAIN, encodePrimitive(leaf)])

    return sha256(await buf.arrayBuffer());
}

async function labeledHash(label: string, contentHash: Hash): Promise<Hash> {
    const buf = new Blob([LABELED_DOMAIN, textEncoder.encode(label), contentHash]);

    return sha256(await buf.arrayBuffer());
}

async function emptyHash(): Promise<Hash> {
    return sha256(EMPTY_DOMAIN);
}

export async function sha256(data: ArrayBuffer | Uint8Array): Promise<Hash> {
    try {
        return crypto.subtle.digest('SHA-256', data);
    } catch (e) {
        throw new Error("Your device doesn't support cryptography API! Try upgrading your browser.");
    }
}

export function encodePrimitive(data: TPrimitiveType): ArrayBuffer {
    switch (typeof data) {
        case "string":
            return textEncoder.encode(data);

        case "number":
        case "bigint":
            return numberToUint8Array(data);

        case "boolean":
            return booleanToUin8Array(data);

        default:
            throw new Error("Unsupported type");
    }
}

function booleanToUin8Array(b: boolean): Uint8Array {
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

function numberToUint8Array(n: number | bigint): Uint8Array {
    if (Number.isNaN(n)) {
        throw new Error("The number is NaN");
    }

    if (typeof n === "bigint") {
        return toLittleEndian(n);
    }

    if (!Number.isInteger(n)) {
        throw new Error("Floats are not supported");
    }

    return numToUint8Array(n);
}

function toLittleEndian(bigNumber: bigint): Uint8Array {
    let result = new Uint8Array(32);
    let i = 0;

    while (bigNumber > 0n) {
        result[i] = Number(bigNumber % 256n);
        bigNumber = bigNumber / 256n;
        i += 1;
    }

    return result;
}

export interface IKeyTree {
    [key: string]: IKeyTree | null;
}

interface IMerkleObjectField {
    key: string;
    value: TPrimitiveType | MerkalizedDocument;
    valueHash: Hash,
    keyValueHash: Hash,
}

type TMerkleObject = IMerkleObjectField[];

export class MerkalizedDocument {
    private _rootHash: Hash;
    private _merkleObj: TMerkleObject;

    static async fromObject(document: IDocument): Promise<MerkalizedDocument> {
        const it = new MerkalizedDocument(document);
        const result = await MerkalizedDocument.merkalize(document);

        if (result === null) {
            throw new Error('InvalidDocument', { cause: JSON.stringify(document) });
        }

        const [rootHash, merkleObj] = result;

        it._rootHash = rootHash;
        it._merkleObj = merkleObj;

        return it;
    }

    keys(): string[] {
        return this._merkleObj.map(it => it.key);
    }

    values(): (TPrimitiveType | MerkalizedDocument | null)[] {
        return this._merkleObj.map(it => it.value);
    }

    hasKey(key: string): boolean {
        return this._merkleObj.findIndex(it => it.key === key) !== -1;
    }

    get(key: string): TPrimitiveType | MerkalizedDocument | null | undefined {
        return this._merkleObj.find(it => it.key === key)?.value;
    }

    rootHash(): Hash {
        return this._rootHash;
    }

    document(): IDocument {
        return this._document;
    }

    witness(keyTree: IKeyTree): HashTree {
        let witness: HashTree | null = null;
        const currentLevelKeys = Object.keys(keyTree);

        this._merkleObj
            .filter(it => currentLevelKeys.includes(it.key))
            .forEach(it => {
                let subtree: HashTree;
                if (it.value instanceof MerkalizedDocument) {
                    const nextLevelKeys = keyTree[it.key];
                    if (!nextLevelKeys) {
                        throw new Error('InvalidKeyTree');
                    }

                    subtree = it.value.witness(nextLevelKeys);
                } else {
                    subtree = HashTree.leaf(it.value);
                }

                const node = HashTree.labeled(it.key, subtree);

                if (witness == null) {
                    witness = node;
                } else {
                    witness = HashTree.fork(witness, node);
                }
            });

        if (witness == null) {
            throw new Error('Unreacheable');
        }

        return witness;
    }

    private constructor(private _document: IDocument) { }

    private static async merkalize(document: IDocument): Promise<[Hash, TMerkleObject] | null> {
        const sortedKeys = Object.keys(document).sort();

        if (sortedKeys.length == 0) {
            return null;
        }

        const result: TMerkleObject = [];

        let rootHash: Hash | null = null;

        for (let i = 0; i < sortedKeys.length; i++) {
            const key = sortedKeys[i];
            const value = document[key];

            let valueHash: Hash, v: TPrimitiveType | MerkalizedDocument;
            if (!PRIMITIVE_TYPES.includes(typeof value)) {
                v = await MerkalizedDocument.fromObject(value as IDocument);

                if (v === null) {
                    valueHash = await emptyHash();
                } else {
                    valueHash = v._rootHash;
                }
            } else {
                v = value as TPrimitiveType;
                valueHash = await leafHash(v);
            }

            const keyValueHash = await labeledHash(key, valueHash);

            if (rootHash === null) {
                rootHash = keyValueHash;
            } else {
                rootHash = await forkHash(rootHash, keyValueHash);
            }

            const node: IMerkleObjectField = {
                key,
                value: v,
                valueHash,
                keyValueHash,
            };

            result.push(node);
        }

        return [rootHash as Hash, result];
    }
}

export interface IDocumentProof {
    witness: HashTree,
    signatureHex: string,
}

export function proofToJSON(proof: IDocumentProof): string {
    return JSON.stringify({ witness: proof.witness.toJSON(), signatureHex: proof.signatureHex })
}

export function JSONToProof(json: string): IDocumentProof {
    const p = JSON.parse(json);

    return {
        witness: HashTree.fromJSON(p.witness),
        signatureHex: p.signatureHex,
    };
}

type HashTreeType = 'Empty' | 'Fork' | 'Labeled' | 'Leaf' | 'Pruned';
type HashTreePayloadEmpty = null;
type HashTreePayloadFork = [HashTree, HashTree];
type HashTreePayloadLabeled = [string, HashTree];
type HashTreePayloadLeaf = TPrimitiveType;
type HashTreePayloadPruned = Hash;
type HashTreePayload = HashTreePayloadEmpty | HashTreePayloadFork | HashTreePayloadLabeled | HashTreePayloadLeaf | HashTreePayloadPruned;

export interface IHashTreeObject {
    type: HashTreeType,
    payload: null | string | string[],
}

export class HashTree {
    private _payload: HashTreePayload;
    private constructor(private _type: HashTreeType) { }

    toJSON(): string {
        const obj: IHashTreeObject = { type: this._type, payload: null };

        switch (this._type) {
            case "Empty":
                break;

            case "Fork":
                const f = this._payload as HashTreePayloadFork;
                obj.payload = f.map(it => it.toJSON());
                break;

            case "Labeled":
                const l = this._payload as HashTreePayloadLabeled;
                obj.payload = [l[0], l[1].toJSON()];
                break;

            case "Leaf":
                const leaf = this._payload as HashTreePayloadLeaf;
                obj.payload = JSON.stringify(leaf);
                break;

            case "Pruned":
                const p = this._payload as HashTreePayloadPruned;
                obj.payload = hexEncode(new Uint8Array(p));
                break;
        }

        return JSON.stringify(obj);
    }

    static fromJSON(json: string): HashTree {
        const obj: IHashTreeObject = JSON.parse(json);

        switch (obj.type) {
            case "Empty":
                return HashTree.empty();

            case "Fork": {
                const p = obj.payload as string[];

                return HashTree.fork(HashTree.fromJSON(p[0]), HashTree.fromJSON(p[1]))
            }

            case "Labeled": {
                const p = obj.payload as string[];

                return HashTree.labeled(p[0], HashTree.fromJSON(p[1]));
            }

            case "Leaf": {
                const p = obj.payload as string;

                return HashTree.leaf(JSON.parse(p));
            }

            case "Pruned": {
                const p = obj.payload as string;

                return HashTree.pruned(hexDecode(p))
            }
        }
    }

    toDocument(): IDocument {
        const res: IDocument = {};

        this.gatherDocumentFields(res, null);

        return res;
    }

    private gatherDocumentFields(res: IDocument, cur: string | null) {
        switch (this._type) {
            case "Fork": {
                const p = this._payload as HashTreePayloadFork;

                const res1 = {};
                const res2 = {};

                p[0].gatherDocumentFields(res1, cur);
                p[1].gatherDocumentFields(res2, cur);

                res = { ...res, ...res1, ...res2 };
            }

            case "Labeled": {
                const p = this._payload as HashTreePayloadLabeled;

                const res1 = { [p[0]]: {} };

                p[1].gatherDocumentFields(res1, p[0]);

                res = { ...res, ...res1 };
            }

            case "Leaf": {
                const p = this._payload as HashTreePayloadLeaf;

                if (!cur) {
                    throw new Error("Unlabeled leaf found!");
                }

                res[cur] = p;
            }

            case "Empty":
            case "Pruned": {
                return;
            }
        }
    }

    async reconstruct(): Promise<Hash> {
        switch (this._type) {
            case "Empty":
                return emptyHash();

            case "Fork":
                const f = this._payload as HashTreePayloadFork;
                return forkHash(await f[0].reconstruct(), await f[1].reconstruct());

            case "Labeled":
                const l = this._payload as HashTreePayloadLabeled;
                return labeledHash(l[0], await l[1].reconstruct());

            case "Leaf":
                const leaf = this._payload as HashTreePayloadLeaf;
                return leafHash(leaf);

            case "Pruned":
                const p = this._payload as HashTreePayloadPruned;
                return p;
        }
    }

    static empty(): HashTree {
        const it = new HashTree('Empty');
        it._payload = null;

        return it;
    }

    static fork(left: HashTree, right: HashTree): HashTree {
        const it = new HashTree('Fork');
        it._payload = [left, right];

        return it;
    }

    static labeled(label: string, subtree: HashTree): HashTree {
        const it = new HashTree('Labeled');
        it._payload = [label, subtree];

        return it;
    }

    static leaf(value: TPrimitiveType): HashTree {
        const it = new HashTree('Leaf');
        it._payload = value;

        return it;
    }

    static pruned(hash: Hash): HashTree {
        const it = new HashTree('Pruned');
        it._payload = hash;

        return it;
    }
}

export async function aesGcmEncrypt(message: ArrayBuffer, rawKey: BufferSource): Promise<Uint8Array> {
    // 96-bits; unique per message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        message,
    );
    const ciphertext = new Uint8Array(ciphertextBuffer);
    var ivAndCiphertext = new Uint8Array(iv.length + ciphertext.length);
    ivAndCiphertext.set(iv, 0);
    ivAndCiphertext.set(ciphertext, iv.length);

    return ivAndCiphertext;
}

export async function aesGcmDecrypt(ivAndCiphertext: Uint8Array, rawKey: BufferSource): Promise<ArrayBuffer> {
    // 96-bits; unique per message
    const iv = ivAndCiphertext.subarray(0, 12);
    const ciphertext = ivAndCiphertext.subarray(12);
    const aesKey = await window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);

    let decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        ciphertext
    );

    return decrypted;
}