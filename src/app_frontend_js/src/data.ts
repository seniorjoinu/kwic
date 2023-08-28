import { SigningKey } from "ethers";
import { WITNESS_PRIVKEY_HEX } from "./api";
import { Hash, IKeyTree, MerkalizedDocument } from "./utils/crypto";
import { IDigitalDocumentProps } from "./components/DigitalDocument";

export const USERNAME = "Viktor";

export type TPrimitiveType = string | number | bigint | boolean;

export interface IDocument {
    [key: string]: TPrimitiveType | IDocument;
}

export interface ISignedDocument {
    document: IDocument,
    signatureHex: string,
}

export type TSchemaTypeConstraint = "string" | "number" | "bigint" | "date" | "boolean" | "nested";

export interface ISchemaField {
    name: string;
    constraints: {
        type: TSchemaTypeConstraint,
    },
}

export interface IDocumentSchema {
    schemaName: string,
    content: {
        [key: string]: ISchemaField,
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
        firstName: {
            name: "First Name",
            constraints: {
                type: "string"
            }
        },
        lastName: {
            name: "Last Name",
            constraints: {
                type: "string",
            }
        },
        dateOfBirth: {
            name: "Date Of Birth",
            constraints: {
                type: "date"
            }
        },
        stateOfResidence: {
            name: "State Of Residence",
            constraints: {
                type: "string"
            },
        },
        dateOfIssuance: {
            name: "Date Of Issuance",
            constraints: {
                type: "date"
            }
        },
    }
});

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

// TODO: only works for single level documents
export function verifyDocumentRequest(document: IDocument, request: IKeyTree): boolean {
    for (let key of Object.keys(request)) {
        if (!document.hasOwnProperty(key)) {
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
    content: string | [string, string] | IDigitalDocumentProps;
    datetime: string,
}

export const now = new Date("06/18/2004");

function toTimeString(d: Date): string {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function toDateString(d: Date): string {
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`
}

export function calculateAge(birthday: number, now: number) {
    var ageDifMs = now - birthday;
    var ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export const CHAT = async (): Promise<IChatMessage[]> => {
    const document = await signedPassport();
    const schema = krakozhiaPassportSchema();

    return [
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
            content: { document, schema, variant: 'chat' },
            datetime: toTimeString(now),
        },
        {
            from: krakozhiaWitness().name,
            content: "Here you go! Have a great day :)",
            datetime: toTimeString(now),
        }
    ];
}