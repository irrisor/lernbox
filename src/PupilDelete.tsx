import * as React from "react";
import {Button, Grid, Typography} from "@material-ui/core";
import {reactContext} from "./Context";
import {Main} from "./layout/Main";

export function PupilDelete() {
    const context = React.useContext(reactContext);
    const name = context.pupil ? context.pupil.name : "Alle";
    return (<>
        <Main>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="h4">{name} löschen</Typography>
                </Grid>
                <Grid item xs={12}>
                    Dies kann nicht rückgängig gemacht werden.
                    {context.pupil ? `Soll der Schüler '${name}' wirklich gelöscht werden?` :
                        "Sollen wirklich alle Schülerdaten gelöscht werden?"}
                </Grid>
                <Grid item xs={12}>
                    <Button onClick={() => context.deletePupil()} fullWidth variant="contained">Ja, löschen</Button>
                </Grid>
            </Grid>
        </Main>
    </>);
}
