import * as React from "react";
import {useEffect} from "react";
import {reactContext} from "./Context";
import {useHistory} from "react-router-dom";
import {Button, TextField, Typography} from "@material-ui/core";
import {Main} from "./layout/Main";
import {Bottom} from "./layout/Bottom";

export function Question() {
    const context = React.useContext(reactContext);
    const history = useHistory();
    const [input, setInput] = React.useState("");

    function check() {
        const card = context.card;
        if (!card) return;
        card.slotChanged = Date.now();
        if (card.answers.indexOf(input.trim()) >= 0) {
            card.slot = (card.slot || 0) + 1;
            history.push(`/pupil/${context.pupilIndex}/right`);
        } else {
            card.slot = 0;
            history.push(`/pupil/${context.pupilIndex}/wrong`);
        }
    }

    const [waiting, setWaiting] = React.useState(5);
    useEffect(() => {
        if (waiting > 0) {
            const timeout = setTimeout(() => setWaiting(waiting - 1), 1000);
            return () => clearTimeout(timeout);
        }
    }, [waiting]);

    return (
        <>
            <Main>
                <Typography variant="h5">{}</Typography>
                <TextField
                    autoFocus
                    label="Antwort"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyPress={ev => {
                        if (ev.key === "Enter" && (waiting === 0 || input)) {
                            check();
                            ev.preventDefault();
                        }
                    }}
                />
            </Main>
            <Bottom>
                <Button variant="contained" color="primary" onClick={check}
                        fullWidth
                        disabled={(waiting > 0) && !input}
                >
                    Abschicken
                </Button>
            </Bottom>
        </>
    );
}
