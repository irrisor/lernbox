import * as React from "react";
import {Main} from "../layout/Main";
import {reactContext} from "../data/Context";
import { useParams } from "react-router-dom";

export function HelpView() {
    const context = React.useContext(reactContext);
    const {mode} = useParams();
    const fileName = context.isTeacher ?
        (mode === "short" ? "/LernboxKurzanleitung.pdf" : "/LernboxAnleitung.pdf")
        : "/LernboxSchueleranleitung.pdf";
    return (<>
        <Main>
            <object data={fileName} type="application/pdf" style={{width: "100%", height: "100%"}}>
                Hier wird die Lernboxanleitung direkt angezeigt, sofern ein PDF-Plugin im Browser verfügbar ist.
                Alternativ kann man die <a href={fileName} download>Anleitung</a> herunterladen.
            </object>
        </Main>
    </>);
}
