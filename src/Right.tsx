import * as React from "react";
import {Button, Grid} from "@material-ui/core";
import {Back} from "./Back";
import {randomPositiveSVG} from "./svgs";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {reactContext} from "./Context";

export function Right() {
    const context = React.useContext(reactContext);
    const svg = React.useMemo(() => randomPositiveSVG(), [context.card]);
    return (<>
        <Main>
            <Grid container spacing={2} justify="center" alignContent="center">
                <Grid item xs={12}>
                    <Back/>
                </Grid>
                <Grid item xs={12}>
                    Richtig! Die Karte kommt in das nächste Fach.
                </Grid>
                <Grid item xs={12}>
                    <img src={svg} height={64} alt="negative" style={{
                        margin: "auto",
                        paddingTop: 8,
                        paddingBottom: 8,
                        display: "block",
                    }}/>
                </Grid>
            </Grid>
        </Main>
        <BottomGridContainer>
            <Grid item xs={12}>
                <Button variant="contained" color="primary" onClick={() => context.next()} fullWidth autoFocus>
                    Weiter
                </Button>
            </Grid>
        </BottomGridContainer>
    </>);
}
