import * as React from "react";
import {reactContext} from "./Context";
import {IndexCardVisual} from "./IndexCardVisual";
import {IndexCard} from "./cards";

export function Back({card}: {
    card: IndexCard | undefined,
}) {
    const context = React.useContext(reactContext);
    if (!card) return <>Keine Karte aktiv</>;
    const overlappingGroups = context.currentGroups.filter(group => card.groups.indexOf(group) >= 0);
    return (
        <IndexCardVisual
            category={overlappingGroups.length > 0 ? overlappingGroups[0] : (card.groups.length > 0 ? card.groups[0] : "")}
            text={card.answers[0]}
            image={card.answerImage}
        />
    );
}
