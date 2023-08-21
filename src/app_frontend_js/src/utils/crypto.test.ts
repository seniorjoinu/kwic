import { MerkalizedDocument } from "./crypto";

async function prepareDocument(): Promise<MerkalizedDocument> {
    return MerkalizedDocument.fromObject({
        a: 123,
        b: true,
        c: 1.23,
        d: 123n,
        e: "test",
        f: {
            a1: 123,
            b1: true,
        }
    });
}

test('document can be constructed', async () => {
    const doc = await prepareDocument();

    expect(doc.keys()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(doc.get('a')).toBe(123);
    expect(doc.get('b')).toBe(true);
    expect(doc.get('c')).toBe(1.23);
    expect(doc.get('d')).toBe(123n);
    expect(doc.get('e')).toBe('test');
    expect(doc.get('f')).toBeInstanceOf(MerkalizedDocument);

    const innerDoc = doc.get('f') as MerkalizedDocument;
    expect(innerDoc.keys()).toEqual(['a1', 'b1']);
    expect(innerDoc.get('a1')).toBe(123);
    expect(innerDoc.get('b1')).toBe(true);
});

test('witness is valid', async () => {
    const doc = await prepareDocument();
    const witness = doc.witness({ a: null, c: null, f: { a1: null } });

    const expectedRootHash = doc.rootHash();
    const actualRootHash = await witness.reconstruct();

    expect(actualRootHash).toEqual(expectedRootHash);
});