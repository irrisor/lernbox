import * as React from "react";
import {Box} from "@material-ui/core";

export function Main(props: { children: React.ReactNode }) {
    return (
        <Box
            display="flex"
            flexDirection="column"
            textAlign="center"
            flexGrow={1}
            m={1}
            style={{width: "350px"}}
        >
            {props.children}
        </Box>
    );
}
