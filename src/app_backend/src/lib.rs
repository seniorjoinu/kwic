use candid::Principal;
use ic_cdk::{caller, query, update};
use keccak_hash::keccak_256;
use libsecp256k1::{recover, Message, RecoveryId, Signature};
use std::{cell::RefCell, collections::btree_map::Entry, str::FromStr};
use types::{
    CanisterId, EcdsaSignature, EncryptedDocument, VetKDCurve, VetKDEncryptedKeyReply,
    VetKDEncryptedKeyRequest, VetKDKeyId, VetKDPublicKeyReply, VetKDPublicKeyRequest,
};

use crate::types::State;

mod types;

const VETKD_SYSTEM_API_CANISTER_ID: &str = "s55qq-oqaaa-aaaaa-aaakq-cai";

thread_local! {
    static STATE: RefCell<State> = RefCell::default();
}

#[update]
fn authorize(principal_signature: EcdsaSignature) {
    debug_println_caller("authorize");

    if principal_signature.len() != 65 {
        panic!(
            "Invalid signature size {}, should be 65",
            principal_signature.len()
        );
    }

    let caller = caller();

    if caller == Principal::anonymous() {
        panic!("Please, authorize yourself");
    }

    let mut principal_hash = [0u8; 32];
    keccak_256(caller.as_slice(), &mut principal_hash);

    let signature =
        Signature::parse_standard_slice(&principal_signature[0..64]).expect("Invalid signature");
    let rec_id = if principal_signature[64] >= 27 {
        principal_signature[64] - 27
    } else {
        principal_signature[64]
    };

    let recovery_id = RecoveryId::parse(rec_id).expect("Invalid recovery id");
    let message = Message::parse_slice(&principal_hash).expect("Invalid message");

    let public_key = recover(&message, &signature, &recovery_id).expect("Unable to recover pubkey");
    let mut pubkey_hash = [0u8; 32];
    keccak_256(&public_key.serialize(), &mut pubkey_hash);

    let mut user_address = [0u8; 20];
    user_address.copy_from_slice(&pubkey_hash[12..]);

    STATE.with(|it| {
        it.borrow_mut().users.insert(caller, user_address);
    });
}

#[update]
fn store_encrypted_document(document: EncryptedDocument) {
    debug_println_caller("store_encrypted_document");

    let caller = caller();

    if caller == Principal::anonymous() {
        panic!("Please, authorize yourself");
    }

    STATE.with(|it| {
        let mut state = it.borrow_mut();

        let user_web3_address = state
            .users
            .get(&caller)
            .expect("Please, authorize yourself")
            .clone();

        match state.documents.entry(user_web3_address) {
            Entry::Occupied(mut e) => {
                e.get_mut().push(document);
            }
            Entry::Vacant(e) => {
                let v = vec![document];

                e.insert(v);
            }
        }
    })
}

#[query]
fn list_my_documents() -> Vec<EncryptedDocument> {
    debug_println_caller("list_my_documents");

    let caller = caller();

    STATE.with(|it| {
        let state = it.borrow();

        let user_web3_address = state
            .users
            .get(&caller)
            .expect("Please, authorize yourself");

        state
            .documents
            .get(user_web3_address)
            .cloned()
            .unwrap_or_default()
    })
}

#[update]
async fn encrypted_symmetric_key_for_caller(encryption_public_key: Vec<u8>) -> Vec<u8> {
    debug_println_caller("encrypted_symmetric_key_for_caller");

    // we're using caller's MetaMask derived principal as a deriviation path
    let user_principal = caller();
    let user_address = STATE.with(|it| {
        it.borrow()
            .users
            .get(&user_principal)
            .cloned()
            .expect("Please, authorize yourself")
    });

    let request = VetKDEncryptedKeyRequest {
        derivation_id: user_address.as_slice().to_vec(),
        public_key_derivation_path: vec![b"symmetric_key".to_vec()],
        key_id: bls12_381_test_key_1(),
        encryption_public_key,
    };

    let (response,): (VetKDEncryptedKeyReply,) = ic_cdk::api::call::call(
        vetkd_system_api_canister_id(),
        "vetkd_encrypted_key",
        (request,),
    )
    .await
    .expect("call to vetkd_encrypted_key failed");

    response.encrypted_key
}

#[update]
async fn symmetric_key_verification_key() -> Vec<u8> {
    let request = VetKDPublicKeyRequest {
        canister_id: None,
        derivation_path: vec![b"symmetric_key".to_vec()],
        key_id: bls12_381_test_key_1(),
    };

    let (response,): (VetKDPublicKeyReply,) = ic_cdk::api::call::call(
        vetkd_system_api_canister_id(),
        "vetkd_public_key",
        (request,),
    )
    .await
    .expect("call to vetkd_public_key failed");

    response.public_key
}

fn bls12_381_test_key_1() -> VetKDKeyId {
    VetKDKeyId {
        curve: VetKDCurve::Bls12_381,
        name: "test_key_1".to_string(),
    }
}

fn vetkd_system_api_canister_id() -> CanisterId {
    CanisterId::from_str(VETKD_SYSTEM_API_CANISTER_ID).expect("failed to create canister ID")
}

fn debug_println_caller(method_name: &str) {
    ic_cdk::println!(
        "{}: caller: {} (isAnonymous: {})",
        method_name,
        ic_cdk::caller().to_text(),
        ic_cdk::caller() == candid::Principal::anonymous()
    );
}
