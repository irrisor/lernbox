import * as React from "react";
import {Main} from "../layout/Main";
import {Grid, Link, Typography} from "@material-ui/core";
import version from "../version.json";

export function AboutView() {
    return (<>
        <Main>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h4">Über Lernbox</Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="subtitle1" style={{fontSize: "0.7rem"}}>
                        Version {version.version}
                    </Typography>
                    <Link href="https://github.com/irrisor/lernbox" target="_blank">Lernbox</Link> ist
                    proprietäre Software, darf aber frei von Schülern und Lehrern zu Bildungszwecken
                    verwendet werden.
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h6">Bilder</Typography>
                </Grid>
                <Grid item xs={12}>
                    Die verwedeten Bilder sind entweder ebenfalls von den Autoren erstellt oder aber verlinken
                    auf <Link href="https://commons.wikimedia.org/" target="_blank">Wikimedia Commons</Link>.
                </Grid>
            </Grid>
        </Main>
    </>);
}
