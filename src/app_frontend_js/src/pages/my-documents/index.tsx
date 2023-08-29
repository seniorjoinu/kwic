import { createResource, onMount } from "solid-js";
import { listMyDocuments } from "../../api";
import { DigitalDocument, IDigitalDocumentProps } from "../../components/DigitalDocument";
import { useNavigate } from "@solidjs/router";
import { Header } from "../../components/Header/header";
import "./index.scss";
import documentIcon from '../../../assets/document.svg';
import plusIcon from '../../../assets/plus.svg';
import { krakozhiaPassportSchema } from "../../utils/data";

export const MyDocumentsPage = () => {
    const [documents] = createResource(listMyDocuments);
    const navigate = useNavigate();
    const noDocs = () => {
        return (!documents() || documents().length == 0);
    }

    onMount(() => {
        document.title = "Kwic";
    });

    const handleBtnClick = () => {
        navigate("/chat");
    }

    const body = () => {
        const docs = documents();

        const btn = (
            <button onClick={handleBtnClick}>
                <div>
                    <img src={documentIcon} />
                    <span>Request a new document</span>
                </div>
                <img class="plus" src={plusIcon} />
            </button>
        );

        const docElems = docs && docs.map(it => {
            const document = it;
            const schema = krakozhiaPassportSchema();
            const props: IDigitalDocumentProps = {
                document,
                schema,
                variant: 'list',
            };

            return <DigitalDocument {...props} />
        });

        return (
            <>
                <ul class="documents">{docElems}</ul>
                {btn}
            </>
        );
    };

    const title = () => noDocs() ? "My Documents" : `My Documents (${documents().length})`;
    const subtitle = () => noDocs() ? "You don't have any documents yet" : "Select a document you wan to authorize with";

    return (
        <main class="my-documents">
            <div class="bg" />
            <Header />

            <div class="modal">
                <div class="title">
                    <h2>{title()}</h2>
                    <p>{subtitle()}</p>
                </div>
                {body()}
            </div>
        </main>
    )
}