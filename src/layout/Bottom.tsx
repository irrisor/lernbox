import * as React from "react";
import {Box, Grid} from "@material-ui/core";

export function Bottom(props: { children: React.ReactNode }) {
    return (
        <Box display="flex" flexDirection="column">
            <Grid container spacing={2}>
                {props.children}
            </Grid>
        </Box>
    );
}
