import { aesGcmEncrypt, aesGcmDecrypt } from "./aes";
import { MerkalizedDocument, HashTree, sha256, verifyDocumentProof, verifyDocumentRequest, verifyDocumentSchema } from "./merkalized-documents";
import type { IDocumentProof, IProofRequest, THash } from "./merkalized-documents"

export { aesGcmEncrypt, aesGcmDecrypt, MerkalizedDocument, HashTree, sha256 };
export type { IDocumentProof, IProofRequest, THash };