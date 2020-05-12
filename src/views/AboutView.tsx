import * as React from "react";
import {Main} from "../layout/Main";
import {Grid, Typography} from "@material-ui/core";

export function AboutView() {
    return (<>
        <Main>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h4">Über Lernbox</Typography>
                </Grid>
                <Grid item xs={12}>
                    Lernbox
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h6">Bilder</Typography>
                </Grid>
            </Grid>
        </Main>
    </>);
}
