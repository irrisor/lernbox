import * as React from "react";
import {useEffect} from "react";
import {reactContext} from "../data/Context";
import {useHistory} from "react-router-dom";
import {
    Button,
    FormControlLabel,
    Grid,
    LinearProgress,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from "@material-ui/core";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {Front} from "../components/Front";
import {Activity, addActivity} from "../data/Pupil";


export function onEnterPressed(call: () => void): React.KeyboardEventHandler {
    return ev => {
        if (ev.key === "Enter") {
            call();
            ev.preventDefault();
        }
    }
}

export function onTabPress(call: () => void): React.KeyboardEventHandler {
    return ev => {
        if (ev.key === "Tab") {
            call();
            ev.preventDefault();
        }
    }
}

export function Question() {
    const context = React.useContext(reactContext);
    const history = useHistory();
    const [input, setInput] = React.useState("");

    const instance = context.cardInstance;
    const card = context.card;
    const maxPassSeconds = card && card.time_s > 0 ? card.time_s : Number.MAX_VALUE;
    const [secondsPassed, setSecondsPassed] = React.useState(0);
    useEffect(() => {
        if (!context.cardInstance && context.currentPupilId !== undefined) context.next();
    }, [context]);
    useEffect(() => {
        if (instance) {
            const lastEntry = instance.activityEntries && instance.activityEntries.length > 0 && instance.activityEntries[instance.activityEntries.length - 1];
            if (!lastEntry || lastEntry.activity !== Activity.VIEW || lastEntry.timestamp < Date.now() - 1000 * 60) {
                context.modifyPupilsCardInstance(instance.id, instance => {
                    addActivity(instance, Activity.VIEW);
                    return instance;
                });
            }
        }
    }, [context, instance]);

    function check(value: string = input) {
        if (!instance || !card) return;
        context.modifyPupilsCardInstance(instance.id, instance => {
            instance.slotChanged = Date.now();
            instance.previousSlot = instance.slot;
            if (card.answers.filter(answer => !!answer.trim()).indexOf(value.trim()) >= 0) {
                if (maxPassSeconds >= secondsPassed) {
                    instance.slot = (instance.slot || 0) + 1;
                    addActivity(instance, Activity.RIGHT);
                    history.push(`/pupil/${context.pupil?.name || "-"}/${context.currentPupilId}/right`);
                } else {
                    instance.slot = 0;
                    addActivity(instance, Activity.LATE);
                    history.push(`/pupil/${context.pupil?.name || "-"}/${context.currentPupilId}/late`);
                }
            } else {
                instance.slot = 0;
                addActivity(instance, Activity.WRONG);
                history.push(`/pupil/${context.pupil?.name || "-"}/${context.currentPupilId}/wrong`);
            }
            return instance;
        });
    }

    const minWaitSeconds = 5;
    useEffect(() => {
        const timeout = setTimeout(() => setSecondsPassed(secondsPassed + 1), 1000);
        return () => clearTimeout(timeout);
    }, [secondsPassed]);

    const inputType = card?.inputType || "text";
    const checkIfInputOrNoWait = () => {
        if (secondsPassed >= minWaitSeconds || input) check();
    };
    const toBeFocused = React.useRef<HTMLElement>(null);
    return (
        <>
            <Main>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Front card={card}/>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h5"> </Typography>
                        {inputType === "select" ?
                            <RadioGroup aria-label="answer" name="answer" value={input}
                                        onChange={event => setInput(event.target.value)}
                                        style={{marginLeft: 16}}
                                        ref={toBeFocused}
                            >
                                {card?.inputOptions?.map((option, index) =>
                                    <FormControlLabel value={option}
                                                      key={option}
                                                      control={<Radio/>}
                                                      label={option}
                                                      onDoubleClick={() => check()}
                                                      onKeyPress={onEnterPressed(checkIfInputOrNoWait)}
                                                      onFocus={() => setInput(option)}
                                    />)}
                                <div>
                                    {/*focus first element on key down*/}
                                    <input autoFocus
                                           onKeyDown={() => {
                                               console.log(toBeFocused.current?.children.item(0));
                                               (toBeFocused.current?.children.item(0) as HTMLElement)?.focus();
                                           }}
                                           style={{
                                               maxWidth: 0,
                                               maxHeight: 0,
                                               border: "none",
                                               background: "transparent",
                                               color: "transparent",
                                               outline: "none",
                                           }}
                                    />
                                </div>
                            </RadioGroup>
                            :
                            <TextField
                                autoFocus
                                label="Antwort"
                                type={inputType === "number_or_nan" ? "number" : inputType}
                                value={input}
                                onChange={event => setInput(event.target.value)}
                                onKeyPress={onEnterPressed(checkIfInputOrNoWait)}
                                onKeyDown={onTabPress(checkIfInputOrNoWait)}
                                fullWidth
                            />
                        }
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
                {inputType === "number_or_nan" && <Grid item xs={6}>
                    <Button variant="contained" onClick={() => check("NaN")}
                            fullWidth
                    >
                        geht nicht
                    </Button>
                </Grid>}
                <Grid item xs={inputType === "number_or_nan" ? 6 : 12}>
                    <Button variant="contained" color="primary" onClick={() => check()}
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
