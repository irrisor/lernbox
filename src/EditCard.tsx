import * as React from "react";
import {Main} from "./layout/Main";
import {Button, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography} from "@material-ui/core";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {IndexCard} from "./cards";
import {IndexCardVisual} from "./IndexCardVisual";
import {Front} from "./Front";

export function EditCard() {
    const [card, setCard] = React.useState<IndexCard>({
        question: "Huhu?",
        answers: ["Huhu!"],
        groups: ["Test"],
        time_s: 15,
        image: "Dolphin.svg",
        imageParameters: {
            "text": "",
        }
    });
    const [temporaryImageParameters, setTemporaryImageParameters] = React.useState<string>(JSON.stringify(card.imageParameters));
    const [temporaryImageParametersError, setTemporaryImageParametersError] = React.useState<string>("");
    return (
        <>
            <Main>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Front card={card}/>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h5">Karte bearbeiten</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Text Vorderseite / Frage"
                            value={card.question}
                            onChange={event => setCard(Object.assign({}, card,
                                {question: event.target.value}))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Beschreibung"
                            value={card.description||""}
                            onChange={event => setCard(Object.assign({}, card,
                                {description: event.target.value || undefined}))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Bild Vorderseite"
                            value={card.image || ""}
                            onChange={event => setCard(Object.assign({}, card,
                                {image: event.target.value}))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
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
                                } catch ( e ) {
                                    setTemporaryImageParametersError(e.message||"Kein gültiges JSON");
                                }
                            }}
                            fullWidth
                            error={!!temporaryImageParametersError}
                            helperText={temporaryImageParametersError||undefined}
                        />
                    </Grid>
                    <Grid item xs={12}>
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
                    <Grid item xs={12}>
                        <TextField
                            label="Text Rückseite / Antwort"
                            value={card.answers[0]}
                            onChange={event => setCard(Object.assign({}, card,
                                {answers: [event.target.value].concat(card.answers.slice(1))}))}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
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
                    <Grid item xs={6}>
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
                    <Grid item xs={6}>
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
                    <Grid item xs={12}>
                        <IndexCardVisual
                            category={card.groups.join(", ")}
                            text={card.answers[0]}
                        />
                    </Grid>
                    <Grid item xs={12}/>
                </Grid>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12}>
                    <Button variant="contained" color="primary"
                            fullWidth
                            disabled={!card.question ||
                            card.answers.length === 0 ||
                            card.groups.length === 0}
                    >
                        Speichern
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>);
}
