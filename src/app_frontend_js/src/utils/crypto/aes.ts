// encrypts a byte buffer using AES encryption
export async function aesGcmEncrypt(message: ArrayBuffer, rawKey: BufferSource): Promise<Uint8Array> {
    // 96-bits; unique per message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        message,
    );
    const ciphertext = new Uint8Array(ciphertextBuffer);
    var ivAndCiphertext = new Uint8Array(iv.length + ciphertext.length);
    ivAndCiphertext.set(iv, 0);
    ivAndCiphertext.set(ciphertext, iv.length);

    return ivAndCiphertext;
}

// decrypts cyphertext into a byte buffer using AES encryption
export async function aesGcmDecrypt(ivAndCiphertext: Uint8Array, rawKey: BufferSource): Promise<ArrayBuffer> {
    // 96-bits; unique per message
    const iv = ivAndCiphertext.subarray(0, 12);
    const ciphertext = ivAndCiphertext.subarray(12);
    const aesKey = await window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);

    let decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        ciphertext
    );

    return decrypted;
}
