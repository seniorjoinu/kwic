import { Signature } from "ethers";
import { IDocument, IDocumentSchema, ISchemaField, ISignedDocument, TPrimitiveType, krakozhiaWitness } from "../../data";
import { storeDocument } from "../../api";
import { createSignal } from "solid-js";
import { shareDataRequest } from "../../pages/share-request";
import { IDocumentProof, MerkalizedDocument, proofToJSON } from "../../utils/crypto";

export interface IDigitalDocumentFieldProps {
    name: string,
    value: IDocument | TPrimitiveType,
    schema: ISchemaField,
}

export function DigitalDocumentField(props: IDigitalDocumentFieldProps) {
    let value;
    switch (props.schema.constraints.type) {
        case "string":
            value = props.value as string;
            break;

        case "number":
        case "bigint":
            value = props.value.toString();
            break;

        case "date":
            const d = new Date(props.value as number);
            value = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
            break;

        default:
            throw new Error("Unsupported");
    }

    return (
        <li>
            <span class="key">{props.schema.name}:</span>
            <span class="value">{value}</span>
        </li>
    )
}

export interface IDigitalDocumentProps {
    document: ISignedDocument,
    schema: IDocumentSchema,
    variant: 'chat' | 'list',
}

export function DigitalDocument(props: IDigitalDocumentProps) {
    const [blocked, setBlocked] = createSignal(false);
    const [saved, setSaved] = createSignal(false);

    const fields = Object.keys(props.document.document).map(key => {
        const p: IDigitalDocumentFieldProps = {
            name: key,
            value: props.document.document[key],
            schema: props.schema.content[key],
        };

        return <DigitalDocumentField {...p} />
    });

    const handleBtn = async () => {
        setBlocked(true);
        await storeDocument(props.document);
        setBlocked(false);
        setSaved(true);
    };

    const handleUse = async () => {
        if (shareDataRequest === null) {
            throw new Error("Request is null");
        }

        setBlocked(true);

        const merkalizedDocument = await MerkalizedDocument.fromObject(props.document.document);
        const witness = merkalizedDocument.witness(shareDataRequest.keys);

        const proof: IDocumentProof = {
            witness,
            signatureHex: props.document.signatureHex,
        };

        window.parent.postMessage(proofToJSON(proof));

        setTimeout(() => window.close(), 1000);
    }

    const btnOrStatus = () => {
        if (props.variant == 'list') {
            return <button disabled={blocked()} onClick={handleUse}>Use</button>
        }

        if (saved()) {
            return <h6>Document saved!</h6>;
        } else {
            return <button disabled={blocked()} onClick={handleBtn}>Save</button>;
        }
    };

    return (
        <div>
            <h4>{props.schema.schemaName}</h4>
            <ul>
                {fields}
            </ul>
            <div>Signed by {krakozhiaWitness().name}</div>
            {btnOrStatus()}
        </div>
    );
}