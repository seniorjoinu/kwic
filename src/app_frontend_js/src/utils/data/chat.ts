// In this document we define the whole chat session Viktor <-> Krakozhia Passport Service

import { IDigitalDocumentProps } from "../../components/DigitalDocument";
import { now, toDateTimeString } from "../time";
import { USERNAME, krakozhiaPassportSchema, krakozhiaPassportService, signedViktorPassport } from "./prelude";

export interface IChatMessage {
    from: string,
    content: string | [string, string] | IDigitalDocumentProps;
    datetime: string,
}

export const CHAT = async (): Promise<IChatMessage[]> => {
    const document = await signedViktorPassport();
    const schema = krakozhiaPassportSchema();

    return [
        {
            from: USERNAME,
            content: "I need a digital copy of my passport.",
            datetime: toDateTimeString(now),
        },
        {
            from: krakozhiaPassportService.name,
            content: "Sure! Please, send us photos of you and your passport.",
            datetime: toDateTimeString(now),
        },
        {
            from: USERNAME,
            content: ["face.webp", "passport.jpg"],
            datetime: toDateTimeString(now),
        },
        {
            from: USERNAME,
            content: "Done.",
            datetime: toDateTimeString(now),
        },
        {
            from: krakozhiaPassportService.name,
            content: { document, schema, variant: 'chat' },
            datetime: toDateTimeString(now),
        },
        {
            from: krakozhiaPassportService.name,
            content: "Here you go! Have a great day :)",
            datetime: toDateTimeString(now),
        }
    ];
}