import * as React from "react";
import {Main} from "./layout/Main";
import {Grid} from "@material-ui/core";
import {reactContext} from "./Context";
import {Front} from "./Front";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import {useParams} from "react-router";
import {IndexCardVisual} from "./IndexCardVisual";
import ResizeDetector from 'react-resize-detector';

export const cardBreakpoints = {xs: 12 as 12, sm: 12 as 12, md: 6 as 6, lg: 4 as 4, xl: 3 as 3};

export function ListCards() {
    const context = React.useContext(reactContext);
    const {group} = useParams();
    const groups = context.groups(true);
    const groupIndex = group ? groups.indexOf(group) : -1;
    const activeTab = groupIndex >= 0 ? groupIndex : 0;
    return (
        <>
            <Main>
                <ResizeDetector
                    handleWidth
                    render={({ width }) => (
                        <Tabs value={groupIndex >= 0 ? groupIndex : 0}
                              onChange={(event, newTab) => context.history.push(`/list/${groups[newTab]}`)}
                              aria-label="tabs"
                              style={{marginBottom: 8, width, position: "absolute"}}
                              variant="scrollable"
                              scrollButtons="auto"
                        >
                            {groups.map(group => (
                                <Tab label={group} id={`${group}-tab`} aria-label={group} key={group}/>
                            ))}
                        </Tabs>
                    )}
                />
                <div style={{height: 64}}/>
                <Grid container spacing={2}>
                    <Grid item {...cardBreakpoints}>
                            <IndexCardVisual text="+"
                                             description="Hier klicken, um eine neue Karte anzulegen."
                                             onClick={() => context.history.push(`/edit/new/${group}`)}
                            />
                    </Grid>
                    {context.cards.filter(card => card.groups.indexOf(groups[activeTab]) >= 0).map(card => (
                        <Grid item {...cardBreakpoints} key={card.id}>
                                <Front card={card} onClick={() => context.history.push(`/edit/${card.id}`)}/>
                        </Grid>
                    ))}
                    {/*<Grid item xs={12}>
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
                            <Grid item xs={12} sm={12} md={6} lg={4} xl={3}>
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
                            <Grid item xs={12} sm={6} md={6} lg={4} xl={3}>
                                <IndexCardVisual image={link}/>
                            </Grid>
                        </>)
                        }*/}
                </Grid>
            </Main>
        </>);
}
