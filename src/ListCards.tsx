import * as React from "react";
import {AppBar, Box, Grid} from "@material-ui/core";
import {reactContext} from "./Context";
import {Front} from "./Front";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import {useParams} from "react-router";
import {IndexCardVisual} from "./IndexCardVisual";
import ResizeDetector from 'react-resize-detector';
import {IndexCard} from "./cards";

export const cardBreakpoints = {xs: 12 as 12, sm: 12 as 12, md: 6 as 6, lg: 4 as 4, xl: 3 as 3};

export function ListCards() {
    const context = React.useContext(reactContext);
    const {group, subgroup} = useParams();
    return <CardList
        navigate={(group, subgroup) => context.history.push(`/list/${group}/${subgroup}`)}
        create={group => context.history.push(`/edit/new/${group}`)}
        onClick={card => context.history.push(`/edit/${card.id}`)}
        {...{group, subgroup}}/>;
}

export function CardList({onClick, imagesOnly, group, subgroup, navigate, create}: {
    onClick: (card: IndexCard) => void,
    imagesOnly?: boolean,
    group: string | undefined,
    subgroup: string | undefined,
    navigate: (group?: string, subgroup?: string) => void
    create?: (group?: string) => void
}) {
    const context = React.useContext(reactContext);
    const indexCards = imagesOnly ? context.cards.filter(card => card.questionImage?.url) : context.cards;
    const groups = context.groups(true, indexCards);
    const groupIndex = group ? groups.indexOf(group) : -1;
    const activeGroup = group || groups[groupIndex !== -1 ? groupIndex : 0];
    const groupCards = activeGroup ? indexCards.filter(card => (context.getCard(card)?.groups.indexOf(activeGroup) || 0) >= 0) : [];
    const groupCardsWithoutSubgroup = groupCards.filter(card => card.groups.length === 1);
    const rest = "...";
    const subgroups = (groupCardsWithoutSubgroup.length > 0 ? [rest] : []).concat(
        Array.from(new Set(context.groups(false, groupCards).filter(subgroup => subgroup !== activeGroup)).values()));
    const subgroupIndex = subgroup ? subgroups.indexOf(subgroup) : -1;
    const activeSubgroup = subgroup || subgroups[subgroupIndex !== -1 ? subgroupIndex : 0];
    return (
        <>
            <ResizeDetector
                handleWidth
                render={({width}) => (
                    <Box width={1}
                         style={{marginBottom: 8, width, position: "absolute"}}>
                        <AppBar position="static"><Tabs value={groupIndex >= 0 ? groupIndex : 0}
                                                        onChange={(event, newTab) => navigate(groups[newTab])}
                                                        aria-label="tabs"
                                                        variant="scrollable"
                                                        scrollButtons="auto"
                                                        color="primary"
                        >
                            {groups.map(group => (
                                <Tab label={group} id={`${group}-tab`} aria-label={group} key={group}/>
                            ))}
                        </Tabs></AppBar>
                        <Box width={1} height={48} style={{backgroundColor: "white"}}>
                            <Tabs value={subgroupIndex >= 0 ? subgroupIndex : 0}
                                  onChange={(event, newTab) => navigate(activeGroup, subgroups[newTab] !== rest ? subgroups[newTab] : "")}
                                  aria-label="tabs"
                                  variant="scrollable"
                                  scrollButtons="auto"
                            >
                                {subgroups.map(subgroup => (
                                    <Tab label={subgroup} id={`${subgroup}-tab`} aria-label={subgroup} key={subgroup}/>
                                ))}
                            </Tabs>
                        </Box>
                    </Box>
                )}
            />
            <div style={{height: 128}}/>
            <Grid container spacing={2}>
                {create &&
                <Grid item {...cardBreakpoints}>
                    <IndexCardVisual text="+"
                                     description="Hier klicken, um eine neue Karte anzulegen."
                                     onClick={() => create(activeGroup)}
                    />
                </Grid>}
                {indexCards.filter(card => {
                    return card.groups.indexOf(activeGroup) === 0 && (
                        subgroups.length === 1 || (activeSubgroup === rest ? card.groups.length === 1 : card.groups.indexOf(activeSubgroup || "") > 0
                        ));
                }).map(card => (
                    <Grid item {...cardBreakpoints} key={card.id}>
                        <Front card={card}
                               onClick={() => onClick(card)}/>
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
        </>);
}
