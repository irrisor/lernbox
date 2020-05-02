import * as React from "react";
import {Box} from "@material-ui/core";
import {Bar} from "./Bar";
import {ErrorBoundary} from "../util/ErrorBoundary";

export const ScreenBox = ({fullScreen, children}: { fullScreen?: boolean, children: React.ReactNode }) => <Box
    height="100%"
    bgcolor="background.default"
>
    <Box
        display="flex"
        height="100%"
        bgcolor="background.default"
        maxHeight={fullScreen ? undefined : 750}
        padding={1}
        paddingBottom={1}
    >
        <Bar>
            <Box
                display="flex"
                flexGrow={1}
                flexDirection="column"
                maxWidth={fullScreen ? undefined : "600px"}
                minWidth="350px"
                width={fullScreen ? "100%" : "80%"}
                mx="auto"
            >
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </Box>
        </Bar>
    </Box>
</Box>;