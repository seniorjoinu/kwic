import { createResource } from "solid-js";
import { listMyDocuments } from "../../api";
import { DigitalDocument, IDigitalDocumentProps } from "../../components/DigitalDocument";
import { krakozhiaPassportSchema } from "../../data";
import { useNavigate } from "@solidjs/router";
import { Header } from "../../components/Header/header";
import "./index.scss";

export const MyDocumentsPage = () => {
    const [documents] = createResource(listMyDocuments);
    const navigate = useNavigate();

    const handleBtnClick = () => {

        navigate("/chat");
    }

    const body = () => {
        const docs = documents();

        if (!docs || docs.length == 0) {
            return (
                <>
                    <h4>You don't have any verified documents</h4>
                    <button onClick={handleBtnClick}>Request a document</button>
                </>
            )
        }

        const docElems = docs.map(it => {
            const document = it;
            const schema = krakozhiaPassportSchema();
            const props: IDigitalDocumentProps = {
                document,
                schema,
                variant: 'list',
            };

            return <DigitalDocument {...props} />
        });

        return <ul>{docElems}</ul>;
    };

    return (
        <main class="my-documents">
            <Header />
            <h2>My Documents</h2>
            {body()}
        </main>
    )
}