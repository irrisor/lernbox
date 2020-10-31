import * as React from "react";
import {Context, getCard, getQuestionCards, reactContext} from "../data/Context";
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
import Tooltip from "@material-ui/core/Tooltip";
import {Front} from "../components/Front";
import withStyles from "@material-ui/core/styles/withStyles";

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
const StyledTooltip = withStyles(() => ({
    tooltip: {
        maxWidth: 600,
    },
}))(Tooltip);


function groupMatches(group: string[], groups?: string[]): boolean {
    if (!groups) return group.length === 0;
    if (group.length > 0) {
        return groups.length >= group.length && group[0] === groups[0] && groupMatches(group.slice(1), groups.slice(1));
    } else {
        return true;
    }
}

export function Overview() {
    const context = React.useContext(reactContext);
    const pupil = context.pupil;
    const [activeTab, setActiveTab] = React.useState(0);
    const classes = useStyles();
    const [expandedGroup, setExpandedGroup] = React.useState<string | undefined>();
    const questionCards = React.useMemo(
        () => getQuestionCards(context.cards), [context.cards]);
    const cards: Readonly<Array<IndexCard | IndexCardInstance>> = questionCards;
    const instances: Readonly<Array<IndexCard | IndexCardInstance>> = pupil?.instances || [];
    const groups = context.groups(true, context.isTeacher ? cards : instances);
    const [selectedGroups, setSelectedGroups] = React.useState<string[][]>([]);
    const [selectedInstances, setSelectedInstances] = React.useState<string[]>([]);
    const [slotInput, setSlotInput] = React.useState<number | undefined>(1);

    const activeInstances = context.activeInstances;
    const maxHeight = 500;

    // noinspection JSUnusedLocalSymbols
    const instancesAndCards = React.useMemo(() => (instances?.map(instance => [instance, context.getCard(instance)])
        .filter(([instance, card]) => card !== undefined) as [IndexCardInstance, IndexCard][])
        .sort(([a, aCard], [b, bCard]) => {
            const activeOrder = Math.ceil(((a.slotChanged || 0) - (b.slotChanged || 0)) / 60 / 60 / 1000);
            if (activeOrder !== 0) {
                return -activeOrder;
            }
            const slotOrder = ((a.slot as number + 1) || 0) - ((b.slot as number + 1) || 0);
            if (slotOrder !== 0) {
                return slotOrder;
            }
            return (aCard.question || aCard.questionImage?.image || "").localeCompare(bCard.question || bCard.questionImage?.image || "");
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }), [pupil, instances]);


    function tableRowForGroup(group: string[], subgroups: string[], activeCount: number, assignedCount: number, count: number) {
        const groupName = group[group.length - 1];
        return <TableRow key={group.join(";")}>
            <TableCell padding="checkbox">

                <Checkbox
                    checked={!!selectedGroups.find(groups => groupMatches(groups, group))}
                    inputProps={{'aria-labelledby': groupName}}
                    onChange={(event, checked) => {
                        if (checked) {
                            setSelectedGroups(selectedGroups.concat([group]));
                        } else {
                            setSelectedGroups(selectedGroups.filter(selectedGroup => !groupMatches(selectedGroup, group)));
                        }
                    }}
                />
            </TableCell>
            <TableCell padding="checkbox">
                {subgroups.length > 0 && group.length === 1 && <IconButton
                    color="inherit"
                    aria-label="gruppe erweitern"
                    edge="start"
                    onClick={() => expandedGroup === groupName ? setExpandedGroup(undefined) : setExpandedGroup(groupName)}
                >
                    {expandedGroup === groupName ? <ExpandLessIcon/> : <ExpandMoreIcon/>}
                </IconButton>}
            </TableCell>
            <TableCell component="th" scope="row" padding="none" id={groupName}>
                {group.length === 1 ? <span style={{paddingLeft: 20}}/> : null}
                {activeCount ? <Link style={{cursor: "pointer"}} onClick={() => {
                    context.next(groupName);
                }}>{groupName.trim()}</Link> : groupName}
            </TableCell>
            <TableCell align="right">{assignedCount} / {count}</TableCell>
            <TableCell align="right">{activeCount}</TableCell>
        </TableRow>;
    }

    const newInstances = React.useMemo(() => selectedGroups.length > 0 ? questionCards.filter(
        card => !!selectedGroups.find(selectedGroup => groupMatches(selectedGroup, getCard(questionCards, card)?.groups)))
            .filter(card => !instances.find(instance => instance.id === card.id)) : [],
        [selectedGroups, instances, questionCards],
    );
    const groupSelectedInstances = React.useMemo(() => selectedGroups.length > 0 ? instances.filter(
        card => !!selectedGroups.find(selectedGroup => groupMatches(selectedGroup, getCard(questionCards, card)?.groups)))
        : [],
        [selectedGroups, instances, questionCards],
    );

    if (!pupil) return <>Schüler mit der ID "{context.currentPupilId}" fehlt.</>;


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
                    maxHeight: maxHeight + "px",
                    display: activeTab === 0 ? undefined : "none",
                }}>
                    <Table aria-label="Gruppen" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell/>
                                <TableCell/>
                                <TableCell>Gruppe</TableCell>
                                <TableCell align="right">Zugewiesen</TableCell>
                                <TableCell align="right">Aktive Karten</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {groups.flatMap(group => {
                                const groupInstances = activeInstances.filter(instance => groupMatches([group], context.getCard(instance)?.groups));
                                const activeCount = groupInstances.length;
                                const assignedCount = instances.filter(instance => groupMatches([group], context.getCard(instance)?.groups)).length;
                                const groupCards = cards.filter(card => groupMatches([group], context.getCard(card)?.groups));
                                const count = groupCards.length;
                                const subgroups = context.groups(false,
                                    context.isTeacher ? groupCards : groupInstances).filter(subgroup => subgroup !== group);
                                return [(tableRowForGroup([group], subgroups, activeCount, assignedCount, count)),
                                ].concat(subgroups.length > 0 && expandedGroup === group ? subgroups.map(
                                    subgroup => tableRowForGroup([group, subgroup], [],
                                        activeInstances.filter(instance => groupMatches([group, subgroup], context.getCard(instance)?.groups)).length,
                                        instances.filter(instance => groupMatches([group, subgroup], context.getCard(instance)?.groups)).length,
                                        cards.filter(card => groupMatches([group, subgroup], context.getCard(card)?.groups)).length,
                                    ),
                                ) : []);
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TableContainer component={Paper} style={{
                    maxHeight: maxHeight + "px",
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
                            {[...Array(6)].map((dummy, slot) => (
                                <TableRow key={slot}>
                                    <TableCell component="th" scope="row">
                                        {slot > 0 ? "Fach " + slot : "nicht einsortiert"}
                                        {/*<span style={{paddingLeft: 32}}>
                                                {slot > 1 ? [...Array(slot - 1)].map((dummy2, i) =>
                                                        <img src={positiveSVGs[0]} height={16} alt="star"
                                                             key={slot + "-" + i} style={{
                                                            paddingLeft: 2,
                                                            marginBottom: -3,
                                                        }}/>)
                                                    : null}
                                                </span>*/}
                                    </TableCell>
                                    <TableCell align="right">
                                        {slot > 0 && pupil.instances.filter(instance => (instance.slot || -1) === (slot - 1)).length}
                                    </TableCell>
                                    <TableCell align="right">
                                        {activeInstances.filter(instance => (instance.slot || -1) === (slot - 1)).length}
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
                            width: 290,
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
                            width: 100,
                            label: "Bearbeitet",
                            dataKey: "slotChanged",
                            numeric: true,
                        },
                        {
                            width: 64,
                            label: "Aktiv",
                            dataKey: "active",
                            numeric: true,
                        },
                    ]}
                    rowGetter={({index}) => {
                        const [instance, card] = instancesAndCards[index];
                        const nextTryDate = Context.getNextTryDate(instance);
                        const today = moment().startOf('day')
                        const yesterday = moment().add(-1, 'day').startOf('day')
                        const slotChangedMoment = moment(instance.slotChanged);
                        const slotChanged = instance.slotChanged ?
                            (today < slotChangedMoment ? "heute" : (yesterday < slotChangedMoment ? "gestern" : slotChangedMoment.fromNow()))
                            : "nie";
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
                            text: <Box display="flex" width={290 - 32} style={{
                                minWidth: 0,
                            }}>
                                <StyledTooltip title={<Front card={card}/>}>
                                    <Box flexGrow={1} style={{
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                    }}>
                                        {card.question ||
                                        Object.entries(card.questionImage?.parameters || {}).map(entry => entry[1]).join(" ") ||
                                        card.answers[0]}
                                    </Box>
                                </StyledTooltip>
                                <Typography
                                    className={classes.groups}
                                    color="textSecondary"
                                    gutterBottom
                                >{card.groups.join(", ")}</Typography>
                            </Box>,
                            slot: instance.slot !== undefined ? instance.slot + 1 : "-",
                            active: Context.isCardActive(instance) ? "Ja" : nextTryDate ? moment(nextTryDate).fromNow() : "nie",
                            slotChanged,
                        };
                    }}
                    height={maxHeight}
                />}
            </Main>
            <BottomGridContainer>
                {activeTab === 2 && selectedInstances.length > 0 &&
                <Grid item xs={6}>
                    <TextField
                        type="number"
                        value={slotInput !== undefined ? slotInput + 1 : ""}
                        onChange={event => setSlotInput(Number(event.target.value) > 1 &&
                        Number(event.target.value) <= 5 ? Number(event.target.value) - 1 : undefined)}
                    />
                </Grid>
                }
                {activeTab === 2 && selectedInstances.length > 0 &&
                <Grid item xs={6}>
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (slotInput !== undefined) {
                                const slot = slotInput;
                                context.update(newContext =>
                                    // essentially this is not proper context replacement, but as we don't detect
                                    // unchanged root elements, it will work
                                    pupil.instances.forEach(instance => {
                                        if (selectedInstances.indexOf(instance.id) >= 0) {
                                            newContext.modifyPupilsCardInstance(instance.id, modifiedInstance => {
                                                modifiedInstance.slot = slot;
                                                return modifiedInstance;
                                            });
                                        }
                                    }));
                                setSelectedInstances([]);
                            }
                        }}
                        fullWidth
                    >
                        Fach ändern
                    </Button>
                </Grid>}
                {context.isTeacher && activeTab === 0 &&
                <Grid item xs={12}>
                    <Button
                        disabled={newInstances.length === 0}
                        onClick={() => context.update(newContext => {
                            newInstances.forEach(instance => newContext.modifyPupilsCardInstance(instance.id));
                            setSelectedGroups([]);
                        })}
                        fullWidth
                    >
                        Zuweisen
                    </Button>
                </Grid>}
                {context.isTeacher && activeTab === 0 &&
                <Grid item xs={12}>
                    <Button
                        disabled={groupSelectedInstances.length === 0}
                        onClick={() => context.update(newContext => {
                            groupSelectedInstances.forEach(instance => newContext.modifyPupilsCardInstance(instance.id, () => null));
                            setSelectedGroups([]);
                        })}
                        fullWidth
                        color="secondary"
                    >
                        Entfernen
                    </Button>
                </Grid>}
                {context.isTeacher && activeTab === 2 &&
                <Grid item xs={12}>
                    <Button
                        disabled={selectedInstances.length === 0}
                        onClick={() => context.update(newContext => {
                            selectedInstances.forEach(instanceId => newContext.modifyPupilsCardInstance(instanceId, () => null));
                            setSelectedInstances([]);
                        })}
                        fullWidth
                        color="secondary"
                    >
                        Entfernen
                    </Button>
                </Grid>}
                {activeTab === 0 && <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => context.next(...selectedGroups.map(group => group[group.length - 1]))}
                        fullWidth
                    >
                        Lernen
                    </Button>
                </Grid>}
                {!context.isTeacher &&
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        onClick={() => context.update(newContext => {
                            newContext.currentPasswordHash = "";
                            newContext.currentPupilId = undefined;
                            newContext.history.push("/");
                        })}
                        fullWidth
                    >
                        Abmelden
                    </Button>
                </Grid>}
            </BottomGridContainer>
        </>
    );
}
