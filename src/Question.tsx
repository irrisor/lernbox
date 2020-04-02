import * as React from "react";
import {useEffect} from "react";
import {reactContext} from "./Context";
import {useHistory} from "react-router-dom";
import {Button, Grid, LinearProgress, TextField, Typography} from "@material-ui/core";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {Front} from "./Front";


export function onEnter(call: () => void): React.KeyboardEventHandler {
    return ev => {
        if (ev.key === "Enter") {
            call();
            ev.preventDefault();
        }
    }
}

export function Question() {
    const context = React.useContext(reactContext);
    const history = useHistory();
    const [input, setInput] = React.useState("");

    const maxPassSeconds = context.card && context.card.time_s || Number.MAX_VALUE;
    const [secondsPassed, setSecondsPassed] = React.useState(0);

    function check() {
        const card = context.card;
        if (!card) return;
        card.slotChanged = Date.now();
        card.previousSlot = card.slot;
        if (card.answers.indexOf(input.trim()) >= 0) {
            if (maxPassSeconds >= secondsPassed) {
                card.slot = (card.slot || 0) + 1;
                history.push(`/pupil/${context.pupilIndex}/right`);
            } else {
                card.slot = 0;
                history.push(`/pupil/${context.pupilIndex}/late`);
            }
        } else {
            card.slot = 0;
            history.push(`/pupil/${context.pupilIndex}/wrong`);
        }
    }

    const minWaitSeconds = 5;
    useEffect(() => {
        const timeout = setTimeout(() => setSecondsPassed(secondsPassed + 1), 1000);
        return () => clearTimeout(timeout);
    }, [secondsPassed]);

    return (
        <>
            <Main>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Front/>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h5"> </Typography>
                        <TextField
                            autoFocus
                            label="Antwort"
                            value={input}
                            onChange={event => setInput(event.target.value)}
                            onKeyPress={onEnter(() => {
                                if (secondsPassed >= minWaitSeconds || input) check();
                            })}
                            fullWidth
                        />
                    </Grid>
                </Grid>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12}>
                    <LinearProgress variant="determinate"
                                    value={100 - (secondsPassed / maxPassSeconds * 100)}
                                    color={secondsPassed <= maxPassSeconds ? "primary" : "secondary"}
                    />
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" color="primary" onClick={check}
                            fullWidth
                            disabled={(secondsPassed < minWaitSeconds) && !input}
                    >
                        Abschicken
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>
    );
}
