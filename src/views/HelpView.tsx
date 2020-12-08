import * as React from "react";
import {Main} from "../layout/Main";

export function HelpView() {
    return (<>
        <Main>
            <object data="/LernboxKurzanleitung.pdf" type="application/pdf" style={{width: "100%", height: "100%"}}>
                Hier wird die Lernboxanleitung direkt angezeigt, sofern ein PDF-Plugin im Browser verfügbar ist.
                Alternativ kann man die <a href="/LernboxAnleitung.pdf" download>Anleitung</a> oder
                die <a href="/LernboxKurzanleitung.pdf" download>Kurzanleitung</a> herunterterladen.
            </object>
        </Main>
    </>);
}
