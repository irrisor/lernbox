import * as React from "react";
import {Box, Breadcrumbs, Grid, IconButton, Link, TextField, Tooltip, Typography} from "@material-ui/core";
import {reactContext} from "../data/Context";
import {Front} from "../components/Front";
import {useLocation, useRouteMatch} from "react-router";
import {IndexCardVisual} from "../components/IndexCardVisual";
import {IndexCard} from "../data/cards";
import SearchIcon from "@material-ui/icons/Search";
import {AddBox, ArrowUpward, Close, FolderOpen, Public} from "@material-ui/icons";

export const cardBreakpoints = {xs: 12 as 12, sm: 12 as 12, md: 6 as 6, lg: 4 as 4, xl: 3 as 3};

export function CardListView() {
    const context = React.useContext(reactContext);
    const location = useLocation();
    const {path} = useRouteMatch();
    const groupPath = location.pathname.split("/").slice(path.split("/").length).filter(fragment => !!fragment.trim());
    const [searchText, setSearchText] = React.useState("");
    return <CardList
        navigate={(groupPath) => context.history.push(`/teacher/list/${groupPath.join("/")}`)}
        create={groupPath => context.history.push(`/teacher/edit/new/${groupPath.join("/")}`)}
        onClick={card => context.history.push(`/teacher/edit/${card.id}`)}
        {...{groupPath, searchText, setSearchText}}
    />;
}

function groupMatches(cardGroups: string[], groupPath: string[], allowSubGroup: boolean) {
    if (!allowSubGroup && cardGroups.length !== groupPath.length) return false;
    for (let i = 0; i < groupPath.length; i++) {
        if (groupPath[i] !== cardGroups[i]) return false;
    }
    return true;
}

function containsSearchText(searchText: string, ...values: (string | undefined)[]) {
    const searchTextLower = searchText.toLowerCase().split(" ");
    for (const value of values) {
        if (value && searchTextLower.reduce((previousValue, currentValue) => previousValue &&
            value.toLowerCase().indexOf(currentValue) >= 0
            , true)) return true;
    }
    return false;
}

export function CardList({onClick, imagesOnly, groupPath, navigate, create, searchText, setSearchText}: {
    onClick: (card: IndexCard) => void,
    imagesOnly?: boolean,
    groupPath: string[],
    navigate: (groups: string[]) => void,
    create?: (groupPath: string[]) => void,
    searchText: string,
    setSearchText: (newSearchText: string) => void
}) {
    const context = React.useContext(reactContext);
    const allCards = imagesOnly ? context.cards.filter(card => card.questionImage?.url) : context.cards;
    const cardsBelowGroupPath = allCards.filter(card => groupMatches(card.groups, groupPath, true));
    const soughtCards = searchText ? cardsBelowGroupPath.filter(card => containsSearchText(searchText,
        card.question,
        card.groups.join("; "),
        card.answers.join("; "),
        card.description,
    )) : cardsBelowGroupPath;
    const groupCards = !searchText || soughtCards.length > 6 ? soughtCards.filter(card => groupMatches(card.groups, groupPath, false)) : soughtCards;
    context.lastShownList = groupCards;
    const subgroups = Array.from(new Set(soughtCards.filter(card => card.groups.length > groupPath.length)
        .flatMap(card => card.groups[groupPath.length])),
    ).sort((a, b) => a.localeCompare(b));
    const superGroup = groupPath.length > 0 ? groupPath.slice(0, groupPath.length - 1) : undefined;
    const addButton = create && <Tooltip title="Neue Karte anlegen">
        <IconButton onClick={() => create(groupPath)}>
            <AddBox/>
        </IconButton>
    </Tooltip>;
    return (
        <>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Box display="flex" alignItems="center" marginTop={1}>
                        {superGroup && <>
                            <Box m={1}>
                                <Breadcrumbs aria-label="breadcrumb">
                                    <Link color="inherit" href=""
                                          onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                                              event.preventDefault();
                                              navigate([]);
                                          }}>
                                        <Tooltip title="Zur obersten Ebene"><ArrowUpward/></Tooltip>
                                    </Link>
                                    {groupPath.slice(0, groupPath.length - 1).map((group, index) =>
                                        <Link color="inherit" href=""
                                              key={group}
                                              onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                                                  event.preventDefault();
                                                  navigate(groupPath.slice(0, index + 1));
                                              }}>
                                            {group}
                                        </Link>)}
                                    <Typography color="textPrimary">{groupPath[groupPath.length - 1]}</Typography>
                                </Breadcrumbs>
                            </Box></>}
                        {addButton}
                        <Box flexGrow={1}>
                            <TextField variant="outlined"
                                       fullWidth
                                       autoFocus
                                       label={<Box display="flex" alignItems="center"
                                                   marginTop="-4px"><SearchIcon/> Suchen</Box>}
                                       value={searchText}
                                       onChange={event => setSearchText(event.target.value)}
                                       InputProps={{
                                           endAdornment: (
                                               <Tooltip title="Suchtext löschen">
                                                   <IconButton onClick={() => setSearchText("")}>
                                                       <Close/>
                                                   </IconButton>
                                               </Tooltip>
                                           ),
                                       }}
                            />
                        </Box>
                        <Tooltip
                            title="Mit Google in Wikimedia Commons SVG Bildern nach diesen Begriffen suchen (Englisch)">
                            <div><IconButton
                                disabled={!searchText}
                                onClick={() => {
                                    const url = "https://www.google.com/search?tbm=isch&q=site%3Acommons.wikimedia.org+svg+" + searchText.replace(/ /g, "+");
                                    window.open(url, "svg-search");
                                }}>
                                <Public/>
                            </IconButton></div>
                        </Tooltip>
                    </Box>
                </Grid>
                {subgroups.map(subgroup => (
                    <Grid item {...cardBreakpoints} key={subgroup}>
                        <IndexCardVisual
                            text={subgroup}
                            image={<FolderOpen style={{width: 64, height: 64, color: "grey"}}/>}
                            onClick={() => navigate(groupPath.concat(subgroup))}/>
                    </Grid>
                ))}
                {groupCards.map(card => (
                    <Grid item {...cardBreakpoints} key={card.id}>
                        <Front card={card}
                               onClick={() => onClick(card)}/>
                    </Grid>
                ))}
                {subgroups.length === 0 && groupCards.length === 0 && (
                    <Grid item xs={12} key="none">
                        <Typography align="center" style={{marginTop: 100}}>Keine Karten gefunden.
                            {create && <>Mit dem {addButton} Button neben dem Suchfeld eine neue anlegen.</>}</Typography>
                    </Grid>
                )}
            </Grid>
        </>);
}
