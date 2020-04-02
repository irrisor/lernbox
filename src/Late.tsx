import * as React from "react";
import {useEffect} from "react";
import {Box, Button, Grid} from "@material-ui/core";
import {Back} from "./Back";
import {randomNegativeSVG} from "./svgs";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {reactContext} from "./Context";
import {Wrong} from "./Wrong";

export function Late() {
    return (<Wrong text={`Das war leider zu spät. Lerne noch einmal von der Karte und gib die 
    Lösung beim nächsten Mal schneller ein.`}/>)
}
