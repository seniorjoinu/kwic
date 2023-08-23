import { Component, createResource } from "solid-js";
import { listMyDocuments } from "../../api";

export const MyDocumentsPage = () => {
    const [documents] = createResource(listMyDocuments);

    return (
        <main>
            <h1>My Documents</h1>
            <ul>
                {documents()?.map(it => <li>{JSON.stringify(it, undefined, 4)}</li>)}
            </ul>
        </main>
    )
}