import { Signature } from "ethers";
import { storeDocument } from "../../api";
import { createSignal } from "solid-js";
import { parentWindow, shareDataRequest } from "../../pages/share-request";
import { IDocumentProof, MerkalizedDocument } from "../../utils/crypto";
import "./index.scss";
import documentIcon from '../../../assets/document.svg';
import checkIcon from '../../../assets/check.svg';
import smallCheckIcon from '../../../assets/check-1.svg';
import { useNavigate } from "@solidjs/router";
import { IKwicMessage } from "../../utils/data/messages";
import { IDocument, IDocumentSchema, ISchemaField, ISignedDocument, TPrimitiveType, krakozhiaSigner } from "../../utils/data";

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
    const navigate = useNavigate();

    const fields = Object.keys(props.document.document).map(key => {
        const p: IDigitalDocumentFieldProps = {
            name: key,
            value: props.document.document[key],
            schema: props.schema.content[key],
        };

        return <DigitalDocumentField {...p} />
    });

    const handleSave = async () => {
        setBlocked(true);
        await storeDocument(props.document);
        setBlocked(false);
        setSaved(true);
    };

    const handleBack = () => {
        navigate("/my-documents");
    }

    const handleUse = async () => {
        if (shareDataRequest === null || parentWindow === null) {
            throw new Error("Request or parent is null");
        }

        setBlocked(true);

        const merkalizedDocument = await MerkalizedDocument.fromObject(props.document.document);
        const witness = merkalizedDocument.witness(shareDataRequest.keys);

        const proof: IDocumentProof = {
            witness: witness.toJSON(),
            signatureHex: props.document.signatureHex,
        };

        const msg: IKwicMessage = {
            domain: 'kwic',
            type: 'proof',
            payload: proof
        };

        parentWindow.postMessage(msg);

        setTimeout(() => window.close(), 1000);
    }

    const btnOrStatus = () => {
        if (props.variant == 'list') {
            return <button class="btn full" disabled={blocked()} onClick={handleUse}>Use</button>
        }

        if (saved()) {
            return <h6><span>Document saved <img src={smallCheckIcon} /></span> <button class="btn small" onClick={handleBack}>Back to My Documents</button> </h6>;
        } else {
            return <button class="btn full" disabled={blocked()} onClick={handleSave}>Save to My Documents</button>;
        }
    };

    const classNames = props.variant == "chat" ? "document margintop" : "document standalone";

    return (
        <div class={classNames}>
            <h4 class="name"><img src={documentIcon} />{props.schema.schemaName}</h4>
            <ul class="fields">
                {fields}
            </ul>
            <div class="verified" ><img src={checkIcon} /> Signed by: <span>{krakozhiaSigner.name}</span></div>
            {btnOrStatus()}
        </div>
    );
}