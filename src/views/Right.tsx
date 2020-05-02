import * as React from "react";
import {Button, Grid} from "@material-ui/core";
import {Back} from "../components/Back";
import {randomPositiveSVG} from "../img/svgs";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {reactContext} from "../data/Context";

export function Right() {
    const context = React.useContext(reactContext);
    const svg = React.useMemo(() => context.cardInstance && randomPositiveSVG(), [context.cardInstance]);
    return (<>
        <Main>
            <Grid container spacing={2} justify="center" alignContent="center" onClick={() => context.next()}>
                <Grid item xs={12}>
                    <Back card={context.card}/>
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
