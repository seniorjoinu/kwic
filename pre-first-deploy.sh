#! /bin/sh

rm .env
dfx generate
dfx canister create --all
dfx build system_api
dfx build app_backend
node whitelist-env.js