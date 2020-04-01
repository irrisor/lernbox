import * as React from "react";
import {Box} from "@material-ui/core";

export function Main(props: { children: React.ReactNode }) {
    return (
        <Box
            display="flex"
            flexDirection="column"
            textAlign="center"
            flexGrow={1}
            m={0}
            style={{width: "350px", marginTop: 16}}
        >
            {props.children}
        </Box>
    );
}
