import * as React from "react";
import {Context, reactContext} from "../data/Context";
import {Box, Button, Checkbox, Grid, IconButton, Link, TextField} from "@material-ui/core";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import {positiveSVGs} from "../img/svgs";
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import moment from "moment";
import "moment/locale/de";
import Typography from "@material-ui/core/Typography";
import {makeStyles} from "@material-ui/core/styles";
import {IndexCard} from "../data/cards";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import {VirtualizedTable} from "../components/VirtualizedTable";
import {IndexCardInstance} from "../data/Pupil";

moment.locale("de");

const useStyles = makeStyles({
    groups: {
        fontSize: 14,
        textAlign: "right",
        display: "inline-block",
        marginRight: 0,
        marginLeft: "auto",
    },
});

export function Overview() {
    const context = React.useContext(reactContext);
    const pupil = context.pupil;
    const [activeTab, setActiveTab] = React.useState(0);
    const classes = useStyles();
    const [expandedGroup, setExpandedGroup] = React.useState<string | undefined>();
    const groups = context.groups(true, pupil?.instances || []);
    const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
    const [selectedInstances, setSelectedInstances] = React.useState<string[]>([]);
    const [slotInput, setSlotInput] = React.useState<number | undefined>(1);

    const activeInstances = context.activeInstances;
    const maxHeight = 500;

    // noinspection JSUnusedLocalSymbols
    const instancesAndCards = React.useMemo(()=>(pupil?.instances.map(instance => [instance, context.getCard(instance)])
        .filter(([instance, card]) => card !== undefined) as [IndexCardInstance, IndexCard][])
        .sort(([a, aCard], [b, bCard]) => {
            const slotOrder = ((a.slot as number + 1) || 0) - ((b.slot as number + 1) || 0);
            if (slotOrder !== 0) {
                return slotOrder;
            }
            const activeOrder = Math.ceil(((a.slotChanged || 0) - (b.slotChanged || 0)) / 60 / 60 / 1000);
            if (activeOrder !== 0) {
                return activeOrder;
            }
            return (aCard.question || aCard.questionImage?.image || "").localeCompare(bCard.question || bCard.questionImage?.image || "");
        }), [pupil, context]);

    if (!pupil) return <>Schüler mit der ID "{context.currentPupilId}" fehlt.</>;

    function tableRowForGroup(group: string, subgroups: string[], activeCount: number) {
        return <TableRow key={group}>
            <TableCell padding="checkbox">

                <Checkbox
                    checked={selectedGroups.indexOf(group) >= 0}
                    inputProps={{'aria-labelledby': group}}
                    onChange={(event, checked) => {
                        if (checked) {
                            setSelectedGroups(selectedGroups.concat(group));
                        } else {
                            setSelectedGroups(selectedGroups.filter(selectedGroup => selectedGroup !== group));
                        }
                    }}
                />
            </TableCell>
            <TableCell padding="checkbox">
                {subgroups.length > 0 && <IconButton
                    color="inherit"
                    aria-label="gruppe erweitern"
                    edge="start"
                    onClick={() => expandedGroup === group ? setExpandedGroup(undefined) : setExpandedGroup(group)}
                >
                    {expandedGroup === group ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                </IconButton>}
            </TableCell>
            <TableCell component="th" scope="row" padding="none" id={group}>
                {groups.indexOf(group) < 0 ? <span style={{paddingLeft: 20}}/> : null}
                {activeCount ? <Link style={{cursor: "pointer"}} onClick={() => {
                    context.next(group);
                }}>{group.trim()}</Link> : group}
            </TableCell>
            <TableCell
                align="right">{activeCount}</TableCell>
        </TableRow>;
    }

    return (
        <>
            <Main>
                <Tabs value={activeTab}
                      onChange={(event, newTab) => setActiveTab(newTab)}
                      aria-label="tabs"
                      style={{marginBottom: 8}}
                      variant="scrollable"
                      scrollButtons="auto"
                >
                    <Tab label="Gruppen" id="groups-tab" aria-label="nach Gruppen"/>
                    <Tab label="Fächer" id="slots-tab" aria-label="nach Fach"/>
                    {context.isTeacher && <Tab label="Karten" id="cards-tab" aria-label="Kartenliste"/>}
                </Tabs>
                <TableContainer component={Paper} style={{
                    maxHeight: maxHeight+"px",
                    display: activeTab === 0 ? undefined : "none",
                }}>
                    <Table aria-label="Gruppen" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell/>
                                <TableCell/>
                                <TableCell>Gruppe</TableCell>
                                <TableCell align="right">Aktive Karten</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groups.flatMap(group => {
                                const groupInstances = activeInstances.filter(instance => (context.getCard(instance)?.groups.indexOf(group) || 0) >= 0);
                                const activeCount = groupInstances.length;
                                const subgroups = context.groups(false, groupInstances).filter(subgroup => subgroup !== group);
                                return [(tableRowForGroup(group, subgroups, activeCount)),
                                ].concat(subgroups.length > 0 && expandedGroup === group ? subgroups.map(
                                    subgroup => tableRowForGroup(subgroup, [],
                                        activeInstances.filter(instance => (context.getCard(instance)?.groups.indexOf(subgroup) || 0) >= 0).length),
                                ) : []);
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TableContainer component={Paper} style={{
                    maxHeight: maxHeight+"px",
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
                                        {pupil.instances.filter(instance => (instance.slot || 0) === slot).length}
                                    </TableCell>
                                    <TableCell align="right">
                                        {activeInstances.filter(instance => (instance.slot || 0) === slot).length}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {context.isTeacher && activeTab === 2 &&

                <VirtualizedTable
                    rowCount={instancesAndCards.length}
                    columns={[
                        {
                            width: 64,
                            label: "",
                            dataKey: "selected",
                        },
                        {
                            width: 400,
                            label: "Karte",
                            dataKey: "text",
                        },
                        {
                            width: 64,
                            label: "Fach",
                            dataKey: "slot",
                            numeric: true,
                        },
                        {
                            width: 64,
                            label: "Aktiv",
                            dataKey: "active",
                            numeric: true,
                        }
                    ]}
                    rowGetter={({ index }) => {
                        const [instance, card] = instancesAndCards[index];
                        const nextTryDate = Context.getNextTryDate(instance);
                        return {
                            selected: <Checkbox
                                checked={selectedInstances.indexOf(instance.id) >= 0}
                                inputProps={{'aria-labelledby': instance.id}}
                                onChange={(event, checked) => {
                                    if (checked) {
                                        setSelectedInstances(selectedInstances.concat(instance.id));
                                    } else {
                                        setSelectedInstances(selectedInstances.filter(selectedInstance => selectedInstance !== instance.id));
                                    }
                                }}
                            />,
                            text: <Box display="flex" width={1}>
                                <Box flexGrow={1}>{card.question || JSON.stringify(card.questionImage?.parameters)
                                    ?.replace(/[{}"#]/g, "")
                                    ?.replace(/:/g, " ")}
                                </Box>
                                <Typography
                                    className={classes.groups}
                                    color="textSecondary"
                                    gutterBottom
                                >{card.groups.join(", ")}</Typography>
                            </Box>,
                            slot: instance.slot !== undefined ? instance.slot + 1 : "-",
                            active: Context.isCardActive(instance) ? "Ja" : nextTryDate ? moment(nextTryDate).fromNow() : "nie",
                        };
                    }}
                    height={maxHeight}
                />}
            </Main>
            <BottomGridContainer>
                {context.isTeacher && selectedInstances.length > 0 && <>
                    <Grid item xs={6}>
                        <TextField
                            type="number"
                            value={slotInput !== undefined ? slotInput + 1 : ""}
                            onChange={event => setSlotInput(Number(event.target.value) > 1 &&
                            Number(event.target.value) <= 5 ? Number(event.target.value) - 1 : undefined)}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Button
                            variant="contained"
                            onClick={() => {
                                context.update(() =>
                                    // essentially this is not proper context replacement, but as we don't detect
                                    // unchanged root elements, it will work
                                    pupil.instances.forEach(instance => {
                                        if (selectedInstances.indexOf(instance.id) >= 0) {
                                            instance.slot = slotInput;
                                        }
                                    }));
                                setSelectedInstances([]);
                            }}
                            fullWidth
                        >
                            Fach ändern
                        </Button>
                    </Grid>
                </>}
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => context.next(...selectedGroups)}
                        fullWidth
                    >
                        Lernen
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>
    );
}