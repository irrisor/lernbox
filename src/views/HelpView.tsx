import * as React from "react";
import {Main} from "../layout/Main";
import {reactContext} from "../data/Context";

export function HelpView() {
    const context = React.useContext(reactContext);
    return (<>
        <Main>
            <object data={context.isTeacher ? "/LernboxKurzanleitung.pdf" : "/LernboxSchueleranleitung.pdf"} type="application/pdf" style={{width: "100%", height: "100%"}}>
                Hier wird die Lernboxanleitung direkt angezeigt, sofern ein PDF-Plugin im Browser verfügbar ist.
                Alternativ kann man die <a href="/LernboxAnleitung.pdf" download>Anleitung</a>,
                die <a href="/LernboxKurzanleitung.pdf" download>Kurzanleitung</a> oder
                die <a href="/LernboxSchueleranleitung.pdf" download>Anleitung für Schüler</a> herunterterladen.
            </object>
        </Main>
    </>);
}
