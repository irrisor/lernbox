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
            style={{marginTop: 16, overflowY: "auto", overflowX: "hidden", height: "300px"}}
        >
            {props.children}
        </Box>
    );
}
