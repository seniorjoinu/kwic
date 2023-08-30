# Kwic
Digital documents based proof of personhood system

[demo video](https://www.youtube.com/watch?v=awKZAPZeAdI)

[website](https://nfgqb-myaaa-aaaak-ae5rq-cai.icp0.io/) (desktop version only)

# Description
Kwic allows users to securely store digital documents on-chain, using their Metamask wallet to access these documents.
Kwic allows other web services to securely request and verify data from digital documents possesed by their users, and allows users of these web services to only disclose the requested information from their documents, without other data from the same documents.

This is a demo project built for [BNT-7 - vetKeys](https://forum.dfinity.org/t/open-bnt-8-vetkeys-enabling-privacy-preserving-applications-on-the-ic/21294). It demonstrates the following features:
1. **Identity Based Encryption** - using vetKeys and some user identifier we can secretly derive encryption keys which can be used for various client-side encryption protocols.
    - works the same way as in [this example project](https://github.com/dfinity/examples/tree/master/rust/vetkd)
2. **Log in with Metamask** - using digital signatures we can create a delegation chain, that allows us to authorize to apps on the IC with our Metamask address as a user identifier.
    - works in a similar way as in the [Internet Identity](https://identity.ic0.app/)
3. **Partial document disclosure** - using Merkle trees and digital signatures we can enable users to only disclose some fields of their digital documents to other parties, while hiding the others.
    - works the same way as in [the asset canister](https://github.com/dfinity/cdk-rs/tree/main/library/ic-certified-map)


# To run locally
* `./start.sh` in a separate terminal window
* `./pre-first-deploy.sh`
* edit `src/app_backend/lib.rs:15` - replace the old `system_api` canister principal with the one from the `.env` file from the root directory
* `dfx deploy`
* `npm run dev`
* go to `http://localhost:3000/`