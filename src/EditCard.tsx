import * as React from "react";
import {Main} from "./layout/Main";
import {Button, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography} from "@material-ui/core";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {Image, IndexCard} from "./cards";
import {Front} from "./Front";
import {useParams} from "react-router";
import {reactContext} from "./Context";
import {v4 as uuidv4} from "uuid";
import {Back} from "./Back";

export const fieldBreakpoints = {xs: 12 as 12, lg: 6 as 6};

export async function lookupImage(imageDataset: Image | undefined, set: (newImage: Image) => void) {
    const image = imageDataset?.image;
    if (image && !imageDataset?.url) {
        const match = image?.match(
            /^(https:\/\/commons.wikimedia.org\/wiki.*\/File:([^/]*)|https:\/\/upload.wikimedia.org\/.*\/([^/]*)|.*commons.wikimedia.org%2Fwiki%2FFile%3A([^/&]*)&.*|([^/]*))$/);
        const wikiMediaFileName = match ? match[2] || match[3] || match[4] || match[5] : undefined;
        if (wikiMediaFileName) {
            const apiURL = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${
                wikiMediaFileName
            }&prop=imageinfo&iiprop=extmetadata%7Curl&format=json&origin=*`;
            const controller = new AbortController();
            const response = await fetch(apiURL, {mode: "cors", signal: controller.signal});
            const metadata = await response.json();
            const pages = Object.keys(metadata?.query?.pages);
            const page = Array.isArray(pages) && pages.length > 0 && metadata.query.pages[pages[0]];
            if (page?.imageinfo && Array.isArray(page?.imageinfo) && page.imageinfo.length > 0 && page.imageinfo[0]) {
                const imageinfo = page.imageinfo[0];
                set({
                    image: wikiMediaFileName, url: imageinfo.url, infoURL: imageinfo.descriptionurl,
                    parameters: imageDataset?.parameters,
                });
            } else {
                set({
                    image: wikiMediaFileName, url: undefined, infoURL: undefined,
                    parameters: imageDataset?.parameters,
                });
            }
            return () => controller.abort();
        } else if (image?.match(/[./].*/)) {
            set({image: image, url: image, infoURL: undefined, parameters: imageDataset?.parameters});
        }
    }
}

function lookupImageSync(imageDataset: Image | undefined, set: (newImage: Image) => void) {
    return () => {
        lookupImage(imageDataset, set);
    };
}

function ImageParametersField({image, set}: { image: Image | undefined, set: (newImage: Partial<Image>) => void }) {
    const [temporaryImageParameters, setTemporaryImageParameters] = React.useState<string>(JSON.stringify(image?.parameters));
    const [temporaryImageParametersError, setTemporaryImageParametersError] = React.useState<string>("");
    return (
        <TextField
            label="Bild Parameter Vorderseite (JSON)"
            value={temporaryImageParameters}
            onChange={event => {
                const newValue = event.target.value;
                setTemporaryImageParameters(newValue);
                if (newValue) {
                    try {
                        const newImageParameters = JSON.parse(newValue);
                        set(Object.assign({}, image, {parameters: newImageParameters}));
                        setTemporaryImageParametersError("");
                    } catch (e) {
                        setTemporaryImageParametersError(e.message || "Kein gültiges JSON");
                    }
                } else {
                    setTemporaryImageParametersError("");
                    set(Object.assign({}, image, {parameters: undefined}));
                }
            }}
            fullWidth
            error={!!temporaryImageParametersError}
            helperText={temporaryImageParametersError || undefined}
        />
    );
}

export function EditCard() {
    const {cardId, group} = useParams();
    const context = React.useContext(reactContext);
    const isCreate = !cardId || cardId === "new";
    const [card, setCard] = React.useState<IndexCard>(() => {
        const contextCard = context.getCard(cardId);
        const originalCard: IndexCard = contextCard || {
            id: isCreate ? uuidv4() : (cardId as string),
            question: "",
            questionImage: {image: "https://commons.wikimedia.org/wiki/File:Xylophone_(colourful).svg"},
            answers: [""],
            groups: group ? [group] : [],
            time_s: 15,
        };
        return Object.assign({}, originalCard);
    });
    const advancedMode = true /*TODO advanced mode*/;
    React.useEffect(lookupImageSync(card.questionImage, newImage => {
        setCard(Object.assign({}, card,
            {questionImage: newImage}));
    }), [card.questionImage?.image]);
    React.useEffect(lookupImageSync(card.answerImage, newImage => {
        setCard(Object.assign({}, card,
            {answerImage: newImage}));
    }), [card.answerImage?.image]);
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
                                    value={card.questionImage ? card.questionImage.image || "" : ""}
                                    onChange={async event => {
                                        setCard(Object.assign({}, card,
                                            {
                                                questionImage: Object.assign(card.questionImage || {},
                                                    {image: event.target.value, url: undefined, infoURL: undefined}),
                                            }));
                                    }}
                                    fullWidth
                                />
                            </Grid>
                            {advancedMode && <Grid item {...fieldBreakpoints}>
                                <ImageParametersField image={card.questionImage} set={newImage => {
                                    setCard(Object.assign({}, card,
                                        {questionImage: newImage}));
                                }}/>
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
                        <Back
                            card={card}
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
                                <TextField
                                    label="Bild Rückseite"
                                    value={card.answerImage ? card.answerImage.image || "" : ""}
                                    onChange={async event => {
                                        setCard(Object.assign({}, card,
                                            {
                                                answerImage: Object.assign(card.answerImage || {},
                                                    {image: event.target.value, url: undefined, infoURL: undefined}),
                                            }));
                                    }}
                                    fullWidth
                                />
                            </Grid>
                            {advancedMode && <Grid item {...fieldBreakpoints}>
                                <ImageParametersField image={card.answerImage} set={newImage => {
                                    setCard(Object.assign({}, card,
                                        {answerImage: newImage}));
                                }}/>
                            </Grid>}
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
                            disabled={!(card.question || card.questionImage?.url) ||
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
