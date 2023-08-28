export const hexEncode = (bytes: Uint8Array) =>
    bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export const hexDecode = (hexString: string) => {
    const matches = hexString.match(/.{1,2}/g);

    if (matches == null) {
        throw new Error("Invalid hexstring");
    }

    return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
}