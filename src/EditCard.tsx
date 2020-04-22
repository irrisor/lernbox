import * as React from "react";
import {Main} from "./layout/Main";
import {Button, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography} from "@material-ui/core";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {IndexCard} from "./cards";
import {IndexCardVisual} from "./IndexCardVisual";
import {Front} from "./Front";
import {useParams} from "react-router";
import {reactContext} from "./Context";
import {v4 as uuidv4} from "uuid";

export const fieldBreakpoints = {xs: 12 as 12, lg: 6 as 6};

export function EditCard() {
    const {cardId, group} = useParams();
    const context = React.useContext(reactContext);
    const isCreate = !cardId || cardId === "new";
    const [card, setCard] = React.useState<IndexCard>(() => {
        const contextCard = context.getCard(cardId);
        console.log("contextCard=", JSON.stringify(contextCard), context.cards.length);
        const originalCard: IndexCard = contextCard || {
            id: isCreate ? uuidv4() : (cardId as string),
            question: "",
            answers: [""],
            groups: group ? [group] : [],
            time_s: 15,
        };
        return Object.assign({}, originalCard);
    });
    const [temporaryImageParameters, setTemporaryImageParameters] = React.useState<string>(JSON.stringify(card.imageParameters));
    const [temporaryImageParametersError, setTemporaryImageParametersError] = React.useState<string>("");
    const advancedMode = true /*TODO advanced mode*/;
    return (
        <>
            <Main>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h5">Karte {isCreate ? "erstellen" : "bearbeiten"}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Front card={card}/>
                        <Grid container spacing={2}>
                            <Grid item xs={12}/>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Text Vorderseite / Frage"
                                    value={card.question || ""}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {question: event.target.value}))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Bild Vorderseite"
                                    value={card.image || ""}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {image: event.target.value}))}
                                    fullWidth
                                />
                            </Grid>
                            {advancedMode && <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Bild Parameter Vorderseite (JSON)"
                                    value={temporaryImageParameters}
                                    onChange={event => {
                                        setTemporaryImageParameters(event.target.value);
                                        try {
                                            const newImageParameters = JSON.parse(event.target.value);
                                            setCard(Object.assign({}, card,
                                                {imageParameters: newImageParameters}));
                                            setTemporaryImageParametersError("");
                                        } catch (e) {
                                            setTemporaryImageParametersError(e.message || "Kein gültiges JSON");
                                        }
                                    }}
                                    fullWidth
                                    error={!!temporaryImageParametersError}
                                    helperText={temporaryImageParametersError || undefined}
                                />
                            </Grid>}
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Beschreibung"
                                    value={card.description || ""}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {description: event.target.value || undefined}))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Gruppen (mit ; getrennt)"
                                    value={(card.groups || []).join("; ")}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {
                                            groups: event.target.value.split(";").map(s => s.trimStart()),
                                        }))}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <IndexCardVisual
                            category={card.groups.join(", ")}
                            text={card.answers[0]}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={12}/>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Text Rückseite / Antwort"
                                    value={card.answers[0] || ""}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {answers: [event.target.value].concat(card.answers.slice(1))}))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="alternative Antworten (mit ; getrennt)"
                                    value={card.answers.slice(1).join("; ")}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {
                                            answers: card.answers.slice(0, 1).concat(
                                                event.target.value.split(";").map(s => s.trimStart())),
                                        }))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item {...fieldBreakpoints}>
                                <FormControl fullWidth style={{textAlign: "start"}}>
                                    <InputLabel id="inputType-label">Antwortart</InputLabel>
                                    <Select
                                        labelId="inputType-label"
                                        id="inputType-select"
                                        value={card.inputType || "text"}
                                        onChange={event => setCard(Object.assign({}, card,
                                            {inputType: event.target.value}))}
                                    >
                                        <MenuItem value="text">Texteingabe</MenuItem>
                                        <MenuItem value="number">Zahleneingabe</MenuItem>
                                        <MenuItem value="select">Auswahl</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item {...fieldBreakpoints}>
                                <TextField
                                    label="Maximale Zeit in Sekunden"
                                    value={card.time_s || ""}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {time_s: Number(event.target.value)}))}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Auswahloptionen (mit ; getrennt)"
                                    value={(card.inputOptions || []).join("; ")}
                                    disabled={card.inputType !== "select"}
                                    onChange={event => setCard(Object.assign({}, card,
                                        {
                                            inputOptions: event.target.value.split(";").map(s => s.trimStart()),
                                        }))}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={12}/>

                </Grid>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12} md={4}>
                    <Button variant="contained"
                            fullWidth
                            onClick={() => {
                                context.history.push(`/list/${card.groups[0]}`);
                            }}
                    >
                        Zurück
                    </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Button
                            fullWidth
                            color="secondary"
                            onClick={() => {
                                context.history.push(`/list/${card.groups[0]}`);
                                context.cards = context.cards.filter(existingCard => existingCard.id !== card.id);
                            }}
                    >
                        Karte löschen
                    </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Button variant="contained" color="primary"
                            fullWidth
                            disabled={!card.question ||
                            card.answers.length === 0 ||
                            card.groups.length === 0}
                            onClick={() => {
                                const cards = context.cards;
                                const oldIndex = cards.findIndex(existingCard => existingCard.id === card.id);
                                context.cards = cards.slice(0, oldIndex >= 0 ? oldIndex : undefined).concat(
                                    Object.assign({}, card),
                                ).concat(oldIndex >= 0 ? cards.slice(oldIndex + 1) : []);
                                context.history.push("/edit/new");
                                setCard({
                                    id: uuidv4(),
                                    groups: card.groups,
                                    answers: [""],
                                    time_s: card.time_s,
                                });
                            }}
                    >
                        Speichern
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>);
}
