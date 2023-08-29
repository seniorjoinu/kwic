/// This module implements merkalized documents - digital documents which allow partial disclosure of fields
/// For example, you can have a signed document with three fields A, B and C, but only disclose B to other parties
/// This is achieved via transforming a document into a Merkle tree (using the same protocol as in the asset canister)

import { Signature, SigningKey } from "ethers";
import { IDocument, IDocumentSchema, PRIMITIVE_TYPES, TPrimitiveType } from "../data/types";
import { bytesToHex, hexToBytes, primitiveToBytes, strToBytes } from "../encode";
import { krakozhiaSigner } from "../data";
import { krakozhiaPassportService } from "../data/prelude";

export type THash = ArrayBuffer;

// a document that was transformed into a Merkle tree form
// immutable - create a new one, for new data
export class MerkalizedDocument {
    private _rootHash: THash;
    private _merkleObj: TMerkleObject;

    // creates a merkalized document from regular `IDocument`
    // nested `IDocument`'s are transformed into nested `MerkalizedDocument`'s
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

    rootHash(): THash {
        return this._rootHash;
    }

    document(): IDocument {
        return this._document;
    }

    // creates a partial disclosure of merkle tree leafs in `HashTree` format
    // if `null` is provided as an argument, returns `HashTree::pruned(rootHash)`
    // supports nested documents
    // 
    // having a document `{a: 10, b: 20, c: 30}`, expects a request in form `{a: null, c: null}`, to reveal fields `a` and `c`
    // having a document `{a: {b: c: "test"}}`, expects a request in form `{a: {b: {c: null}}}`, to reveal the field `c` 
    witness(keyTree: IProofRequest | null): HashTree {
        if (keyTree === null) {
            return HashTree.pruned(this._rootHash);
        }

        let witness: HashTree | null = null;

        for (let field of this._merkleObj) {
            let node;

            if (!keyTree.hasOwnProperty(field.key)) {
                node = HashTree.pruned(field.keyValueHash);
            } else if (field.value instanceof MerkalizedDocument) {
                node = HashTree.labeled(field.key, field.value.witness(keyTree[field.key]));
            } else {
                node = HashTree.labeled(field.key, HashTree.leaf(field.value));
            }

            if (witness == null) {
                witness = node;
            } else {
                witness = HashTree.fork(witness, node);
            }
        }

        if (witness == null) {
            throw new Error('Unreacheable');
        }

        return witness;
    }

    private constructor(private _document: IDocument) { }

    private static async merkalize(document: IDocument): Promise<[THash, TMerkleObject] | null> {
        const sortedKeys = Object.keys(document).sort();

        if (sortedKeys.length == 0) {
            return null;
        }

        const result: TMerkleObject = [];

        let rootHash: THash | null = null;

        for (let i = 0; i < sortedKeys.length; i++) {
            const key = sortedKeys[i];
            const value = document[key];

            let valueHash: THash, v: TPrimitiveType | MerkalizedDocument;
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

        return [rootHash as THash, result];
    }
}

interface IMerkleObjectField {
    key: string;
    value: TPrimitiveType | MerkalizedDocument;
    valueHash: THash,
    keyValueHash: THash,
}

type TMerkleObject = IMerkleObjectField[];

export interface IProofRequest {
    [key: string]: IProofRequest | null;
}

export interface IDocumentProof {
    witness: string,
    signatureHex: string,
}

type HashTreeType = 'Empty' | 'Fork' | 'Labeled' | 'Leaf' | 'Pruned';
type HashTreePayloadEmpty = null;
type HashTreePayloadFork = [HashTree, HashTree];
type HashTreePayloadLabeled = [string, HashTree];
type HashTreePayloadLeaf = TPrimitiveType;
type HashTreePayloadPruned = THash;
type HashTreePayload = HashTreePayloadEmpty | HashTreePayloadFork | HashTreePayloadLabeled | HashTreePayloadLeaf | HashTreePayloadPruned;

interface IHashTreeObject {
    type: HashTreeType,
    payload: null | string | string[],
}

// witness (partial disclosure) objects compatible with ic-asset-canister (only structure-wise -- the encoding is incompatible!!!)
export class HashTree {
    private _payload: HashTreePayload;
    private constructor(private _type: HashTreeType) { }

    // serializes the witness into JSON string
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
                obj.payload = bytesToHex(new Uint8Array(p));
                break;
        }

        return JSON.stringify(obj);
    }

    // deserializes a witness from JSON string
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

                return HashTree.pruned(hexToBytes(p))
            }
        }
    }

    // transforms the partial disclose into regular `IDocument`, producing a subset of fields of the original document
    toDocument(): IDocument {
        const res = this.gatherDocumentFields() as IDocument;

        if (typeof res !== "object") {
            throw new Error("Invalid witness structure");
        }

        return res;
    }

    static fromObj(obj: any): HashTree {
        const it = new HashTree('Empty');
        Object.assign(it, obj);

        return it;
    }

    private gatherDocumentFields(): IDocument | TPrimitiveType | {} {
        switch (this._type) {
            case "Fork": {
                const p = this._payload as HashTreePayloadFork;

                const res1 = p[0].gatherDocumentFields() as IDocument;
                const res2 = p[1].gatherDocumentFields() as IDocument;

                if (typeof res1 !== "object" || typeof res2 !== "object") {
                    throw new Error("Invalid witness structure");
                }

                return { ...res1, ...res2 };
            }

            case "Labeled": {
                const p = this._payload as HashTreePayloadLabeled;

                const res1 = p[1].gatherDocumentFields();

                return { [p[0]]: res1 };
            }

            case "Leaf": {
                const p = this._payload as HashTreePayloadLeaf;

                return p;
            }

            case "Empty":
            case "Pruned": {
                return {};
            }
        }
    }

    // computes the root hash of the partial disclosure
    // should be the same as in the original `MerkalizedDocument`
    async reconstruct(): Promise<THash> {
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

    static pruned(hash: THash): HashTree {
        const it = new HashTree('Pruned');
        it._payload = hash;

        return it;
    }
}

const FORK_DOMAIN = domainSep('ic-hashtree-fork');
const LEAF_DOMAIN = domainSep('ic-hashtree-leaf');
const LABELED_DOMAIN = domainSep('ic-hashtree-labeled');
const EMPTY_DOMAIN = domainSep('ic-hashtree-empty');

function domainSep(domain: string): ArrayBuffer {
    return new Uint8Array([domain.length, ...strToBytes(domain)]);
}

async function forkHash(l: THash, r: THash): Promise<THash> {
    const buf = new Blob([FORK_DOMAIN, l, r]);

    return sha256(await buf.arrayBuffer());
}

async function leafHash(leaf: TPrimitiveType): Promise<THash> {
    const buf = new Blob([LEAF_DOMAIN, primitiveToBytes(leaf)])

    return sha256(await buf.arrayBuffer());
}

async function labeledHash(label: string, contentHash: THash): Promise<THash> {
    const buf = new Blob([LABELED_DOMAIN, strToBytes(label), contentHash]);

    return sha256(await buf.arrayBuffer());
}

async function emptyHash(): Promise<THash> {
    return sha256(EMPTY_DOMAIN);
}

// computes sha256 hash over a provided byte array
export async function sha256(data: ArrayBuffer | Uint8Array): Promise<THash> {
    try {
        return crypto.subtle.digest('SHA-256', data);
    } catch (e) {
        throw new Error("Your device doesn't support cryptography API! Try upgrading your browser.");
    }
}

// Verifies if the document was produced by following the provided schema
// TODO: only works for single level documents
export function verifyDocumentSchema(document: IDocument, schema: IDocumentSchema): boolean {
    const fieldsDoc = Object.keys(document).sort();
    const fieldsSchema = Object.keys(schema.content);

    if (fieldsDoc.length !== fieldsSchema.length) {
        return false;
    }

    for (let key of fieldsDoc) {
        if (schema.content[key] === undefined) {
            return false
        }

        if (schema.content[key].constraints.type !== typeof document[key]) {
            return false;
        }
    }

    return true;
}

// Verify if the proof request is intended to be used against the provided document
// TODO: only works for single level documents
export function verifyDocumentRequest(document: IDocument, request: IProofRequest): boolean {
    for (let key of Object.keys(request)) {
        if (!document.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

// verifies that the proof was indeed produced following the specified proof request
// and that the proof is signed by the `Krakozhia Passport Service`
// if true, returns the requested fields of the proven document
// if false, returns null
export const verifyDocumentProof = async (proof: IDocumentProof, proofRequest: IProofRequest): Promise<IDocument | null> => {
    const witness = HashTree.fromJSON(proof.witness);
    const gatheredFields = witness.toDocument();

    if (!verifyDocumentRequest(gatheredFields, proofRequest.keys)) {
        return null;
    }

    const rootHash = await witness.reconstruct();
    const signature = Signature.from(proof.signatureHex);
    const pubkey = SigningKey.recoverPublicKey(new Uint8Array(rootHash), signature);

    if (pubkey !== krakozhiaPassportService.signingKey.publicKey) {
        return null;
    }

    return gatheredFields;
}