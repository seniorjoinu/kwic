use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Principal};

pub type CanisterId = Principal;
pub type EcdsaSignature = Vec<u8>;
pub type EncryptedDocument = Vec<u8>;
pub type Web3Address = [u8; 20];

#[derive(Default)]
pub struct State {
    pub documents: BTreeMap<Web3Address, Vec<EncryptedDocument>>,
    pub users: BTreeMap<Principal, Web3Address>,
}

#[derive(CandidType, Deserialize)]
pub enum VetKDCurve {
    #[serde(rename = "bls12_381")]
    Bls12_381,
}

#[derive(CandidType, Deserialize)]
pub struct VetKDKeyId {
    pub curve: VetKDCurve,
    pub name: String,
}

#[derive(CandidType, Deserialize)]
pub struct VetKDPublicKeyRequest {
    pub canister_id: Option<CanisterId>,
    pub derivation_path: Vec<Vec<u8>>,
    pub key_id: VetKDKeyId,
}

#[derive(CandidType, Deserialize)]
pub struct VetKDPublicKeyReply {
    pub public_key: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct VetKDEncryptedKeyRequest {
    pub public_key_derivation_path: Vec<Vec<u8>>,
    pub derivation_id: Vec<u8>,
    pub key_id: VetKDKeyId,
    pub encryption_public_key: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct VetKDEncryptedKeyReply {
    pub encrypted_key: Vec<u8>,
}
