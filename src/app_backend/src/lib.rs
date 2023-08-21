use candid::Principal;
use ic_cdk::{caller, query, update};
use std::{cell::RefCell, collections::btree_map::Entry, str::FromStr};
use types::{
    AuthCertifiate, CanisterId, EcdsaSignature, EncryptedDocument, VetKDCurve,
    VetKDEncryptedKeyReply, VetKDEncryptedKeyRequest, VetKDKeyId, VetKDPublicKeyReply,
    VetKDPublicKeyRequest, Web3Address,
};
use web3::{
    signing::{keccak256, recover},
    types::Recovery,
};

use crate::types::State;

mod types;

const VETKD_SYSTEM_API_CANISTER_ID: &str = "s55qq-oqaaa-aaaaa-aaakq-cai";

thread_local! {
    static STATE: RefCell<State> = RefCell::default();
}

#[update]
fn authorize(principal_signature: EcdsaSignature) {
    let caller = caller();

    if caller == Principal::anonymous() {
        panic!("Please, authorize yourself");
    }

    let principal_hash = keccak256(caller.as_slice());
    let rec =
        Recovery::from_raw_signature(principal_hash, principal_signature).expect("Recovery error");

    let (signature, v) = rec.as_signature().unwrap();

    let user_address: Web3Address = recover(&principal_hash, &signature, v)
        .expect("Recovery error")
        .0;

    STATE.with(|it| {
        it.borrow_mut().users.insert(caller, user_address);
    });
}

#[update]
fn store_encrypted_document(document: EncryptedDocument) {
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
async fn ibe_encryption_key() -> String {
    let request = VetKDPublicKeyRequest {
        canister_id: None,
        derivation_path: vec![b"ibe_encryption".to_vec()],
        key_id: bls12_381_test_key_1(),
    };

    let (response,): (VetKDPublicKeyReply,) = ic_cdk::api::call::call(
        vetkd_system_api_canister_id(),
        "vetkd_public_key",
        (request,),
    )
    .await
    .expect("call to vetkd_public_key failed");

    hex::encode(response.public_key)
}

#[update]
async fn encrypted_ibe_decryption_key_for_caller(encryption_public_key: Vec<u8>) -> String {
    debug_println_caller("encrypted_ibe_decryption_key_for_caller");

    let request = VetKDEncryptedKeyRequest {
        derivation_id: ic_cdk::caller().as_slice().to_vec(),
        public_key_derivation_path: vec![b"ibe_encryption".to_vec()],
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

    hex::encode(response.encrypted_key)
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
