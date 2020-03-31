import * as React from "react";
import {useEffect} from "react";
import {Box, Button} from "@material-ui/core";
import {Back} from "./Back";
import {randomNegativeSVG} from "./svgs";
import {Main} from "./layout/Main";
import {Bottom} from "./layout/Bottom";
import {reactContext} from "./Context";

export function Wrong() {
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

    const svg = React.useMemo(() => randomNegativeSVG(), [context.card]);
    return (<>
        <Main>
            <Back/>
            <Box>
                Das ist leider nicht richtig. Lerne noch einmal von der Karte.
                <img src={svg} height={64} alt="negative" style={{
                    margin: "auto",
                    paddingTop: 8,
                    paddingBottom: 8,
                    display: "block",
                }}/>
            </Box>
        </Main>
        <Bottom>
            <Button variant="contained" color="primary" onClick={()=>context.next()}
                    fullWidth
                    autoFocus={waiting === 0}
                    disabled={waiting > 0}
                    ref={buttonRef}
            >
                {waiting || "Weiter"}
            </Button>
        </Bottom>
    </>);
}
