import { SigningKey } from "ethers";

// our documents only support the following primitive types (+ nested subdocuments)
export type TPrimitiveType = string | number | boolean;
export const PRIMITIVE_TYPES = ["string", "number", "boolean"];

export interface IDocument {
    [key: string]: TPrimitiveType | IDocument;
}

// our documents can have only a single signature
export interface ISignedDocument {
    document: IDocument,
    signatureHex: string,
}

// each document is formatted according to some pre-existing schema
export interface IDocumentSchema {
    schemaName: string,
    content: {
        [key: string]: ISchemaField,
    }
}

// our schema supports the following types of data
export type TSchemaTypeConstraint = "string" | "number" | "date" | "boolean" | "nested";

export interface ISchemaField {
    name: string;
    constraints: {
        type: TSchemaTypeConstraint,
    },
}

// our document are signed by the "signers" - entities that have enough authority so other people believe 
// in their procedures and protocols
export interface IDocumentSigner {
    name: string;
    signingKey: SigningKey,
}

