import * as React from "react";
import {reactContext} from "./Context";
import {IndexCardVisual} from "./IndexCardVisual";

export function Back() {
    const context = React.useContext(reactContext);
    if (!context.card) return <>Keine Karte aktiv</>;
    return (
        <IndexCardVisual
            category={context.currentGroup || context.card.groups.join(", ")}
            text={context.card.answers[0]}
            image={context.card.answerImage}
            imageParameters={context.card.answerImageParameters}
        />
    );
}
