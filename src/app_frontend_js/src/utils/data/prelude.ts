/// here we define all the pre-defined data, like: username, krakozhia passport scheme, the passport itself and stuff like that

import { SigningKey } from "ethers";
import { MerkalizedDocument, THash } from "../crypto";
import { IDocument, IDocumentSchema, IDocumentSigner, ISignedDocument } from "./types";

export const USERNAME = "Viktor";

const SIGNER_PRIVKEY_HEX = '0x0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a';

// was produced by `SIGNER_PRIVKEY_HEX`
// the pubkey is known to a remote website requesting signed documents from their users 
export const SIGNER_PUBKEY_HEX = '0x04f76a39d05686e34a4420897e359371836145dd3973e3982568b60f8433adde6eb61f3694eae50e3815d4ed3068d5892f2571dc8f654271535e23b513dea6cbe3';

// Viktor's digital passport
export const viktorPassport = (): IDocument => ({
    firstName: "VIKTOR",
    lastName: "NAVORSKI",
    dateOfBirth: -440942399000,
    stateOfResidence: "h. HOMEL",
    dateOfIssuance: 870264001000,
});

// Krakozhia passport schema 
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

// Krakozhia Passport Service's public info
export const krakozhiaPassportService: IDocumentSigner = {
    name: "Krakozhia Passport Service",
    signingKey: new SigningKey(SIGNER_PRIVKEY_HEX),
};

export const merkalizedViktorPassport = async (): Promise<MerkalizedDocument> => (
    MerkalizedDocument.fromObject(viktorPassport())
);
export const viktorPassportMerkleRoot = async (): Promise<THash> => (
    (await merkalizedViktorPassport()).rootHash()
);
export const viktorPassportSignature = async (): Promise<string> => (
    (await krakozhiaPassportService.signingKey.sign(new Uint8Array(await viktorPassportMerkleRoot()))).serialized
);

export const signedViktorPassport = async (): Promise<ISignedDocument> => ({
    document: await viktorPassport(),
    signatureHex: await viktorPassportSignature(),
});
