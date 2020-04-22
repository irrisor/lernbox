import * as React from "react";
import {reactContext} from "./Context";
import {IndexCardVisual} from "./IndexCardVisual";

export function Back() {
    const context = React.useContext(reactContext);
    const card = context.card;
    if (!card) return <>Keine Karte aktiv</>;
    const overlappingGroups = context.currentGroups.filter(group => card.groups.indexOf(group) >= 0);
    return (
        <IndexCardVisual
            category={overlappingGroups.length > 0 ? overlappingGroups[0] : (card.groups.length > 0 ? card.groups[0] : "")}
            text={card.answers[0]}
            image={card.answerImage}
            imageParameters={card.answerImageParameters}
        />
    );
}
