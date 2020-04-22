import * as React from "react";
import {Button, Grid, TextField} from "@material-ui/core";
import {onEnterPressed} from "./Question";

export function Search() {
    const [phrase, setPhrase] = React.useState("");
    const url = "https://www.google.com/search?tbm=isch&q=site%3Acommons.wikimedia.org+svg+" + phrase.replace(/ /g, "+");
    // const url = "https://commons.wikimedia.org/w/index.php?title=Special:Search&limit=500&offset=0&profile=default&search="+phrase.replace(/ /g, "+")+"+filemime%3Aimage%2Fsvg%2Bxml&advancedSearch-current={%22fields%22:{%22filetype%22:%22image/svg%20xml%22}}&ns0=1&ns6=1&ns12=1&ns14=1&ns100=1&ns106=1";
    return (<>
        <p/>
        <Grid container spacing={2}>
            <Grid item xs={8}>
                <TextField fullWidth
                           label="Suchwort(e) auf Englisch"
                           value={phrase}
                           onChange={event => setPhrase(event.target.value)}
                           onKeyPress={onEnterPressed(() => window.open(url, "svg-search"))}
                />
            </Grid>
            <Grid item xs={4}>
                <Button variant="contained"
                        href={url}
                        target="svg-search">
                    Suchen
                </Button>
            </Grid>
        </Grid>
    </>);
}
