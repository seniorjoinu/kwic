import { MerkalizedDocument } from "./crypto";
const { describe, it } = intern.getPlugin('interface.bdd');
const { expect } = intern.getPlugin('chai');

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

describe('merkle document', () => {

    it('document can be constructed', async () => {
        const doc = await prepareDocument();

        expect(doc.keys()).to.deep.eq(['a', 'b', 'c', 'd', 'e', 'f']);
        expect(doc.get('a')).to.eq(123);
        expect(doc.get('b')).to.eq(true);
        expect(doc.get('c')).to.eq(1.23);
        expect(doc.get('d')).to.eq(123n);
        expect(doc.get('e')).to.eq('test');
        expect(doc.get('f')).to.be.instanceof(MerkalizedDocument);

        const innerDoc = doc.get('f') as MerkalizedDocument;
        expect(innerDoc.keys()).to.deep.eq(['a1', 'b1']);
        expect(innerDoc.get('a1')).to.eq(123);
        expect(innerDoc.get('b1')).to.eq(true);
    });

    it('witness is valid', async () => {
        const doc = await prepareDocument();
        const witness = doc.witness({ b: null });

        const expectedRootHash = doc.rootHash();
        const actualRootHash = await witness.reconstruct();

        expect(actualRootHash).to.deep.eq(expectedRootHash);
    })

});