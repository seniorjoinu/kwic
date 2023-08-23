import { SigningKey } from "ethers";
import { WITNESS_PRIVKEY_HEX } from "./api";
import { Hash, MerkalizedDocument } from "./utils/crypto";

export const USERNAME = "Viktor";

export type TPrimitiveType = string | number | bigint | boolean;

export interface IDocument {
    [key: string]: TPrimitiveType | IDocument;
}

export interface ISignedDocument {
    document: IDocument,
    signatureHex: string,
}

export interface ISchemaTypeConstraint {
    type: "string" | "number" | "bigint" | "boolean";
}

export interface IDocumentSchema {
    schemaName: string,
    content: {
        [key: string]: ISchemaTypeConstraint,
    }
}

export const krakozhiaPassport = (): IDocument => ({
    firstName: "VIKTOR",
    lastName: "NAVORSKI",
    dateOfBirth: -440942399000,
    stateOfResidence: "h. HOMEL",
    dateOfIssuance: 870264001000,
});

export const krakozhiaPassportSchema = (): IDocumentSchema => ({
    schemaName: "Krakozhia Passport",
    content: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        dateOfBirth: { type: "number" },
        stateOfResidence: { type: "string" },
        dateOfIssuance: { type: "number" },
    }
});

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

        if (typeof document[key] !== schema.content[key].type) {
            return false;
        }
    }

    return true;
}

export interface IDocumentWitness {
    name: string;
    signingKey: SigningKey,
}

export const krakozhiaWitness = (): IDocumentWitness => ({
    name: "Krakozhia Passport Service",
    signingKey: new SigningKey(WITNESS_PRIVKEY_HEX),
});

export const merkalizedKrakozhiaPassport = async (): Promise<MerkalizedDocument> => (
    MerkalizedDocument.fromObject(krakozhiaPassport())
);
export const krakozhiaPassportMerkleRoot = async (): Promise<Hash> => (
    (await merkalizedKrakozhiaPassport()).rootHash()
);
export const passportSignature = async (): Promise<string> => (
    (await krakozhiaWitness().signingKey.sign(new Uint8Array(await krakozhiaPassportMerkleRoot()))).serialized
);

export const signedPassport = async (): Promise<ISignedDocument> => ({
    document: await krakozhiaPassport(),
    signatureHex: await passportSignature(),
});

export interface IChatMessage {
    from: string,
    content: string | [string, string] | ISignedDocument;
    datetime: string,
}

const now = new Date();
function toTimeString(d: Date): string {
    return `${d.getMonth().toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export const CHAT = async (): Promise<IChatMessage[]> => [
    {
        from: USERNAME,
        content: "I need a digital copy of my passport.",
        datetime: toTimeString(now),
    },
    {
        from: krakozhiaWitness().name,
        content: "Sure! Please, send us photos of you and your passport.",
        datetime: toTimeString(now),
    },
    {
        from: USERNAME,
        content: ["face.webp", "passport.jpg"],
        datetime: toTimeString(now),
    },
    {
        from: USERNAME,
        content: "Done.",
        datetime: toTimeString(now),
    },
    {
        from: krakozhiaWitness().name,
        content: await signedPassport(),
        datetime: toTimeString(now),
    },
    {
        from: krakozhiaWitness().name,
        content: "Here you go! Have a great day :)",
        datetime: toTimeString(now),
    }
]