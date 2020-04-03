import * as React from "react";
import {useEffect} from "react";
import {Button, Grid} from "@material-ui/core";
import {Back} from "./Back";
import {randomNegativeSVG} from "./svgs";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {reactContext} from "./Context";

export function Wrong({text = "Das ist leider nicht richtig. Lerne noch einmal von der Karte."}: { text?: string }) {
    const context = React.useContext(reactContext);
    const [waiting, setWaiting] = React.useState(5);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (waiting > 0) {
            const timeout = setTimeout(() => setWaiting(waiting - 1), 1000);
            return () => clearTimeout(timeout);
        } else {
            const button = buttonRef.current;
            button && button.focus();
        }
    }, [waiting]);

    const svg = React.useMemo(() => context.card && randomNegativeSVG(), [context.card]);
    return (<>
        <Main>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Back/>
                </Grid>
                <Grid item xs={12}>
                    {text}
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
                <Button variant="contained" color="primary" onClick={() => context.next()}
                        fullWidth
                        autoFocus={waiting === 0}
                        disabled={waiting > 0}
                        ref={buttonRef}
                >
                    {waiting || "Weiter"}
                </Button>
            </Grid>
        </BottomGridContainer>
    </>);
}
