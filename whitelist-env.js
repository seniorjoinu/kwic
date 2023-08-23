const fs = require('fs');
const textDecoder = new TextDecoder();

let file = textDecoder.decode(fs.readFileSync('.env'));
file = file.split("\n").map(line => line.split("="));

const canisterIdLine = file.find(line => line[0] === "CANISTER_ID_APP_BACKEND");
file.push(["VITE_CANISTER_ID_APP_BACKEND", canisterIdLine[1]]);

const networkLine = file.find(line => line[0] === "DFX_NETWORK");
file.push(["VITE_DFX_NETWORK", networkLine[1]]);

fs.writeFileSync('./src/app_frontend_js/.env', file.map(it => it.join('=')).join('\n'));