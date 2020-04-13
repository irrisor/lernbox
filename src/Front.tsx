import * as React from "react";
import {reactContext} from "./Context";
import {IndexCardVisual} from "./IndexCardVisual";
import {IndexCard} from "./cards";

export function Front({card}: { card: IndexCard | undefined }) {
    const context = React.useContext(reactContext);
    if (!card) return <>Keine Karte aktiv</>;
    return (
        <IndexCardVisual
            category={context.currentGroup || (card.groups.length > 0 ? card.groups[0] : "")}
            text={card.question}
            description={card.description}
            image={card.image}
            imageParameters={card.imageParameters}
        />
    );
}
