import * as React from "react";
import {Button, Grid} from "@material-ui/core";
import {Back} from "./Back";
import {randomPositiveSVG} from "./svgs";
import {Main} from "./layout/Main";
import {Bottom} from "./layout/Bottom";
import {reactContext} from "./Context";

export function Right() {
    const context = React.useContext(reactContext);
    const svg = React.useMemo(() => randomPositiveSVG(), [context.card]);
    return (<>
        <Main>
            <Grid container spacing={2} justify="center" alignContent="center">
                <Grid item>
                    <Back/>
                </Grid>
                <Grid item>
                    Richtig! Die Karte kommt in das nächste Fach.
                    <img src={svg} height={64} alt="negative" style={{
                        margin: "auto",
                        paddingTop: 8,
                        paddingBottom: 8,
                        display: "block",
                    }}/>
                </Grid>
            </Grid>
        </Main>
        <Bottom>
            <Button variant="contained" color="primary" onClick={()=>context.next()} fullWidth autoFocus>
                Weiter
            </Button>
        </Bottom>
    </>);
}
