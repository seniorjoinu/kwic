import { Component, createResource } from "solid-js";
import { listMyDocuments } from "../../api";
import { DigitalDocument, IDigitalDocumentProps } from "../../components/DigitalDocument";
import { krakozhiaPassportSchema } from "../../data";

export const MyDocumentsPage = () => {
    const [documents] = createResource(listMyDocuments);

    return (
        <main>
            <h1>My Documents</h1>
            <ul>
                {documents()?.map(it => {
                    const document = it;
                    const schema = krakozhiaPassportSchema();
                    const props: IDigitalDocumentProps = {
                        document,
                        schema,
                        variant: 'list',
                    };

                    return <DigitalDocument {...props} />
                })}
            </ul>
        </main>
    )
}