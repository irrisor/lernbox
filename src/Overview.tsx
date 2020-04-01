import * as React from "react";
import {reactContext} from "./Context";
import {Button, Grid, Link} from "@material-ui/core";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import {positiveSVGs} from "./svgs";
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

export function Overview() {
    const context = React.useContext(reactContext);
    const pupil = context.pupil;
    const [activeTab, setActiveTab] = React.useState(0);
    if (!pupil) return <>Kein Schüler ausgewählt</>;
    const activeCards = context.activeCards;
    const groups = Array.from(new Set(pupil.cards.flatMap(card => card.groups)))
        .sort((a, b) => a.localeCompare(b));
    return (
        <>
            <Main>
                <Tabs value={activeTab} onChange={(event, newTab) => setActiveTab(newTab)} aria-label="tabs"
                style={{marginBottom: 8}}>
                    <Tab label="Gruppen" id="groups-tab" aria-label="gruppen"/>
                    <Tab label="Fächer" id="slots-tab" aria-label="fach"/>
                </Tabs>
                <TableContainer component={Paper} style={{
                    maxHeight: "500px",
                    display: activeTab === 0 ? undefined : "none",
                }}>
                    <Table aria-label="Gruppen" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Gruppe</TableCell>
                                <TableCell align="right">Aktive Karten</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groups.map(group => {
                                const activeCount = activeCards.filter(card => card.groups.indexOf(group) >= 0).length;
                                return (<TableRow key={group}>
                                        <TableCell component="th" scope="row">
                                            {activeCount ? <Link onClick={() => {
                                                context.next(group);
                                            }}>{group}</Link> : group}
                                        </TableCell>
                                        <TableCell
                                            align="right">{activeCount}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TableContainer component={Paper} style={{
                    maxHeight: "500px",
                    display: activeTab === 1 ? undefined : "none",
                }}>
                    <Table aria-label="Fächer" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Fach</TableCell>
                                <TableCell align="right">Gesamt</TableCell>
                                <TableCell align="right">Aktiv</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[...Array(5)].map((dummy, slot) => (
                                <TableRow key={slot}>
                                    <TableCell component="th" scope="row">
                                        Fach {slot + 1}
                                        <span style={{paddingLeft: 32}}>
                                                {slot > 1 ? [...Array(slot - 1)].map((dummy2, i) =>
                                                        <img src={positiveSVGs[0]} height={16} alt="star"
                                                             key={slot + "-" + i} style={{
                                                            paddingLeft: 2,
                                                            marginBottom: -3,
                                                        }}/>)
                                                    : null}
                                                </span>
                                    </TableCell>
                                    <TableCell align="right">
                                        {pupil.cards.filter(card => (card.slot || 0) === slot).length}
                                    </TableCell>
                                    <TableCell align="right">
                                        {activeCards.filter(card => (card.slot || 0) === slot).length}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        onClick={() => context.history.push("/")}
                        fullWidth
                    >
                        Abmelden
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => context.next()}
                        fullWidth
                    >
                        Lernen
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>
    );
}
