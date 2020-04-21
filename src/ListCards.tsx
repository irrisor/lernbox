import * as React from "react";
import {Main} from "./layout/Main";
import {Grid, Typography} from "@material-ui/core";
import {IndexCardVisual} from "./IndexCardVisual";

export function ListCards() {
    return (
        <>
            <Main>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h6">Tiere</Typography>
                    </Grid>
                    {[
                        "https://commons.wikimedia.org/wiki/File:FMIB_52669_Pagurus_bernhardus,_the_hermit-crab-retouched.svg",
                        "https://commons.wikimedia.org/wiki/File:Sad_panda.svg",
                        "https://commons.wikimedia.org/wiki/File:Pig_icon_05.svg",
                        "https://commons.wikimedia.org/wiki/File:Pig_cartoon_04.svg",
                        "https://commons.wikimedia.org/wiki/File:Turtle_clip_art.svg",
                        "https://commons.wikimedia.org/wiki/File:Yorgia.svg",
                        "https://commons.wikimedia.org/wiki/File:Lemmling_walrus.svg",
                    ].map(link => <>
                        <Grid item xs={4}>
                            <IndexCardVisual image={link}/>
                        </Grid>
                    </>)
                    }
                    <Grid item xs={12}>
                        <Typography variant="h6">Pflanzen</Typography>
                    </Grid>
                    {[
                        "https://commons.wikimedia.org/wiki/File:Apple_unbitten.svg",
                        "https://commons.wikimedia.org/wiki/File:Cactus_chandelle.svg",
                    ].map(link => <>
                        <Grid item xs={4}>
                            <IndexCardVisual image={link}/>
                        </Grid>
                    </>)
                    }
                </Grid>
            </Main>
        </>);
}
