import * as React from "react";
import {Box, Grid} from "@material-ui/core";

export function BottomGridContainer(props: { children: React.ReactNode }) {
    return (
        <Box display="flex" flexDirection="column" marginTop={2}>
            <Grid container spacing={2}>
                {props.children}
            </Grid>
        </Box>
    );
}
