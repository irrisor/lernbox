import * as React from "react";
import {reactContext} from "../data/Context";
import {IndexCardVisual} from "./IndexCardVisual";
import {IndexCard, officialOwner} from "../data/cards";

export function Front({card, onClick, showAuthor}: {
    card: IndexCard | undefined,
    onClick?: () => void,
    showAuthor?: boolean,
}) {
    const context = React.useContext(reactContext);
    if (!card) return <>Keine Karte aktiv</>;
    const overlappingGroups = context.currentGroups.filter(group => card.groups.indexOf(group) >= 0);
    return (
        <IndexCardVisual
            category={(overlappingGroups.length > 0 ? overlappingGroups[0] : (card.groups.length > 0 ? card.groups[0] : "")) +
            showAuthor && card.owner && card.owner !== officialOwner ? " von " + card.owner : ""}
            text={card.question}
            description={card.description}
            image={card.questionImage}
            onClick={onClick}
        />
    );
}
