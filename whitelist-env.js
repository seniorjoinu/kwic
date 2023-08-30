const fs = require('fs');
const textDecoder = new TextDecoder();

let file = textDecoder.decode(fs.readFileSync('.env'));
file = file.split("\n").map(line => line.split("="));

const canisterIdLines = file.filter(line => line[0].startsWith("CANISTER_ID_"));

for (let line of canisterIdLines) {
    file.push([`VITE_${line[0]}`, line[1]]);
}

fs.writeFileSync('./src/app_fronend_js/.env', file.map(it => it.join('=')).join('\n'));