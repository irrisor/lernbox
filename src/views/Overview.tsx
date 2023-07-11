import * as React from "react";
import {Context, getCard, getQuestionCards, reactContext} from "../data/Context";
import {
    Box,
    Button,
    Checkbox,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Link, useMediaQuery,
} from "@material-ui/core";
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
import {makeStyles, useTheme} from "@material-ui/core/styles";
import {IndexCard} from "../data/cards";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import {VirtualizedTable} from "../components/VirtualizedTable";
import {IndexCardInstance} from "../data/Pupil";
import Tooltip from "@material-ui/core/Tooltip";
import {Front} from "../components/Front";
import withStyles from "@material-ui/core/styles/withStyles";
import Dialog from "@material-ui/core/Dialog";

moment.locale("de");

const useStyles = makeStyles({
    groups: {
        fontSize: 14,
        textAlign: "right",
        display: "inline-block",
        marginRight: 0,
        marginLeft: "auto",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        maxWidth: "50%",
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

export function isNotUndefined<T>(value?: T): value is T {
    return value !== undefined;
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
    const [selectedInstancesWithSlotCount, setSelectedInstancesWithSlotCount] = React.useState(0);
    console.log("selectedInstancesWithSlotCount=" + selectedInstancesWithSlotCount);
    const [selectedNonInstances, setSelectedNonInstances] = React.useState<string[]>([]);
    // const [slotInput, setSlotInput] = React.useState<number | undefined>(1);

    const activeInstances = context.activeInstances;
    const maxHeight = 480;

    const instancesAndCards = React.useMemo(() => {
        const instancesOrMissingCards: Array<[IndexCardInstance | undefined, IndexCard]> =
            (instances?.map(instance => [instance, context.getCard(instance)])
                .filter(([, card]) => card !== undefined) as [IndexCardInstance, IndexCard][])
                .filter(([, card]) => selectedGroups.length === 0 || cardSelectedViaGroups(card));
        return instancesOrMissingCards.concat(questionCards.filter(cardSelectedViaGroups)
            .filter(card => !instancesOrMissingCards.find(([, existingCard]) => card === existingCard))
            .map(card => [undefined, card]))
            .sort(([a, aCard], [b, bCard]) => {
                const activeOrder = Math.ceil(((a?.slotChanged || 0) - (b?.slotChanged || 0)) / 60 / 60 / 1000);
                if (activeOrder !== 0) {
                    return -activeOrder;
                }
                const slotOrder = ((a?.slot as number + 1) || 0) - ((b?.slot as number + 1) || 0);
                if (slotOrder !== 0) {
                    return slotOrder;
                }
                const groupOrder = aCard.groups.join(",").localeCompare(bCard.groups.join(","));
                if (groupOrder !== 0) {
                    return groupOrder;
                }
                return (aCard.question || aCard.questionImage?.image || "").localeCompare(bCard.question || bCard.questionImage?.image || "");
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pupil, instances, selectedGroups, questionCards]);


    function tableRowForGroup(group: string[], subgroups: string[], activeCount: number, assignedCount: number, count: number, showAssigned: boolean) {
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
                {activeCount || context.isTeacher ? <Link style={{cursor: "pointer"}} onClick={() => {
                    if (context.isTeacher) {
                        setSelectedGroups([group]);
                        setActiveTab(2);
                    } else {
                        context.next(groupName);
                    }
                }}>{groupName.trim()}</Link> : groupName}
            </TableCell>
            {showAssigned && <TableCell align="right">{assignedCount} / {count}</TableCell>}
            <TableCell align="right">{activeCount}</TableCell>
        </TableRow>;
    }

    function cardSelectedViaGroups(card: IndexCard) {
        return !!selectedGroups.find(selectedGroup => groupMatches(selectedGroup, getCard(questionCards, card)?.groups));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    React.useEffect(() => context.clearCard(), [context.currentInstances.length]);

    React.useEffect(() => context.loadNewRelease());

    const [dialogTitle, setDialogTitle] = React.useState("");
    const [dialogMessage, setDialogMessage] = React.useState("");
    const [confirmed, setConfirmed] = React.useState<() => void | undefined>();
    const [aborted, setAborted] = React.useState<() => void | undefined>();

    function confirmationDialog(message?: string, title = "Bestätigen") {
        return new Promise((resolve, reject) => {
            if (message) {
                setDialogTitle(title);
                setDialogMessage(message);
                setConfirmed(() => resolve);
                setAborted(() => reject);
            } else {
                resolve();
            }
        });
    }

    const theme = useTheme();
    const isWideScreen = useMediaQuery(theme.breakpoints.up('sm'));
    if (!pupil) return <>Schüler mit der ID "{context.currentPupilId}" fehlt.</>;

    const allCheckBoxChecked = (selectedInstances.length + selectedNonInstances.length) > 0;
    const descriptionColumnWidth = 254;
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
                    <Tab label="Themen" id="groups-tab" aria-label="nach Themen"/>
                    <Tab label="Fächer" id="slots-tab" aria-label="nach Fach"/>
                    {context.isTeacher && <Tab label="Karten" id="cards-tab" aria-label="Kartenliste"/>}
                </Tabs>
                <TableContainer component={Paper} style={{
                    maxHeight: maxHeight + "px",
                    display: activeTab === 0 ? undefined : "none",
                }}>
                    <Table aria-label="Themen" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell/>
                                <TableCell/>
                                <TableCell>Thema</TableCell>
                                {isWideScreen && <TableCell align="right">Zugewiesen</TableCell>}
                                <TableCell align="right">Aktive Karten</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {context.isPupilCardsLoading ?
                                "noch keine Karten geladen"
                                :
                            groups.flatMap(group => {
                                const groupInstances = activeInstances.filter(instance => groupMatches([group], context.getCard(instance)?.groups));
                                const activeCount = groupInstances.length;
                                const assignedCount = instances.filter(instance => groupMatches([group], context.getCard(instance)?.groups)).length;
                                const groupCards = cards.filter(card => groupMatches([group], context.getCard(card)?.groups));
                                const count = groupCards.length;
                                const subgroups = context.groups(false,
                                    context.isTeacher ? groupCards : groupInstances).filter(subgroup => subgroup !== group);
                                return [(tableRowForGroup([group], subgroups, activeCount, assignedCount, count, isWideScreen)),
                                ].concat(subgroups.length > 0 && expandedGroup === group ? subgroups.map(
                                    subgroup => tableRowForGroup([group, subgroup], [],
                                        activeInstances.filter(instance => groupMatches([group, subgroup], context.getCard(instance)?.groups)).length,
                                        instances.filter(instance => groupMatches([group, subgroup], context.getCard(instance)?.groups)).length,
                                        cards.filter(card => groupMatches([group, subgroup], context.getCard(card)?.groups)).length,
                                        isWideScreen
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
                <Box height="100%">
                    <VirtualizedTable
                        rowCount={instancesAndCards.length}
                        columns={[
                            {
                                width: 64,
                                label: <Checkbox
                                    checked={allCheckBoxChecked}
                                    indeterminate={allCheckBoxChecked && (selectedInstances.length + selectedNonInstances.length) < instancesAndCards.length}
                                    onChange={(event, checked) => {
                                        if (checked) {
                                            setSelectedInstances(instancesAndCards
                                                .map(([instance]) => instance?.id)
                                                .filter(isNotUndefined));
                                            setSelectedNonInstances(instancesAndCards
                                                .map(([instance, card]) => !instance ? card.id : undefined)
                                                .filter(isNotUndefined));
                                            setSelectedInstancesWithSlotCount(instancesAndCards.filter(([instance]) => (instance?.slot || 0) > 0).length);
                                        } else {
                                            setSelectedInstances([]);
                                            setSelectedNonInstances([]);
                                            setSelectedInstancesWithSlotCount(0);
                                        }
                                    }}
                                />,
                                dataKey: "selected",
                            },
                            {
                                width: descriptionColumnWidth,
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
                                width: 100,
                                label: "Aktiv",
                                dataKey: "active",
                                numeric: true,
                            },
                        ]}
                        rowGetter={({index}) => {
                            const [instance, card] = instancesAndCards[index];
                            const nextTryDate = instance && Context.getNextTryDate(instance);
                            const today = moment().startOf('day')
                            const yesterday = moment().add(-1, 'day').startOf('day')
                            const slotChangedMoment = instance && moment(instance.slotChanged);
                            const slotChanged = instance && (slotChangedMoment && instance.slotChanged ?
                                (today < slotChangedMoment ? "heute" : (yesterday < slotChangedMoment ? "gestern" : slotChangedMoment.fromNow()))
                                : "nie");
                            const id = (instance || card).id;
                            return {
                                selected: <Checkbox
                                    checked={instance ? selectedInstances.indexOf(id) >= 0 : selectedNonInstances.indexOf(id) >= 0}
                                    inputProps={{'aria-labelledby': id}}
                                    onChange={(event, checked) => {
                                        if (instance) {
                                            if (checked) {
                                                setSelectedInstances(selectedInstances.concat(id));
                                                if ((instance.slot || 0) > 0) {
                                                    setSelectedInstancesWithSlotCount(selectedInstancesWithSlotCount + 1);
                                                }
                                            } else {
                                                setSelectedInstances(selectedInstances.filter(selectedInstance => selectedInstance !== id));
                                                if ((instance.slot || 0) > 0) {
                                                    setSelectedInstancesWithSlotCount(selectedInstancesWithSlotCount - 1);
                                                }
                                            }
                                        } else {
                                            if (checked) {
                                                setSelectedNonInstances(selectedNonInstances.concat(id));
                                            } else {
                                                setSelectedNonInstances(selectedNonInstances.filter(selectedInstance => selectedInstance !== id));
                                            }
                                        }
                                    }}
                                />,
                                text: <Box display="flex" width={descriptionColumnWidth - 32} style={{
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
                                    <StyledTooltip title={<Front card={card}/>}>
                                        <Typography
                                            className={classes.groups}
                                            color="textSecondary"
                                            gutterBottom
                                        >{card.groups.join(", ")}</Typography>
                                    </StyledTooltip>
                                </Box>,
                                slot: instance ? (instance.slot !== undefined ? instance.slot + 1 : "-") :
                                    <Tooltip title="nicht zugeordnet"><span>nz</span></Tooltip>,
                                active: instance && (Context.isCardActive(instance) ? "Ja" : nextTryDate ? moment(nextTryDate).fromNow() : "nie"),
                                slotChanged,
                            };
                        }}
                    />
                </Box>}
            </Main>
            <BottomGridContainer>
                {/*activeTab === 2 && selectedInstances.length > 0 &&
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
                </Grid>*/}
                {context.isTeacher && activeTab === 0 &&
                <Grid item xs={12}>
                    <Button
                        disabled={selectedGroups.length === 0}
                        onClick={() => setActiveTab(2)}
                        variant="contained"
                        color="primary"
                        fullWidth
                    >
                        Karten anzeigen
                    </Button>
                </Grid>}
                {context.isTeacher && activeTab === 2 &&
                <Grid item xs={12}>
                    <Button
                        disabled={selectedNonInstances.length === 0}
                        onClick={() => context.update(newContext => {
                            selectedNonInstances.forEach(instanceId => newContext.modifyPupilsCardInstance(instanceId));
                            setSelectedNonInstances([]);
                        })}
                        fullWidth
                        variant="contained"
                    >
                        Zuweisen
                    </Button>
                </Grid>}
                {context.isTeacher && activeTab === 2 &&
                <Grid item xs={12}>
                    <Button
                        disabled={selectedInstances.length === 0}
                        onClick={() => confirmationDialog(selectedInstancesWithSlotCount > 0 ?
                            `Von den selektierten Karten ${selectedInstancesWithSlotCount > 1 ? "sind" : "ist"} bereits 
                            ${selectedInstancesWithSlotCount > 1 ? selectedInstancesWithSlotCount : "eine"} bearbeitet.
                            Diese ${selectedInstancesWithSlotCount > 1 ? "Karten verlieren" : "Karte verliert"}
                            beim Entfernen der Zuordnung alle schülerspezifischen Informationen.
                            Bei erneuter Zuordnung starten solche Karten wieder im ersten Fach.
                            Soll dennoch die Zuordnung aller selektierten Karten aufgehoben werden?` : "",
                            "Entfernen")
                            .then(() => context.update(newContext => {
                                selectedInstances.forEach(instanceId => newContext.modifyPupilsCardInstance(instanceId, () => null));
                                setSelectedInstances([]);
                                setSelectedInstancesWithSlotCount(0);
                            })).catch(() => {
                            })}
                        fullWidth
                        color="secondary"
                    >
                        Entfernen
                    </Button>
                </Grid>}
                {activeTab === 0 && (!context.isTeacher || !pupil.password) && <Grid item xs={12}>
                    <Box width={1}>
                        <Button
                            variant="contained"
                            color={!context.isTeacher ? "primary" : undefined}
                            onClick={() => context.next(...selectedGroups.map(group => group[group.length - 1]))}
                            disabled={instances.length === 0}
                            fullWidth
                        >
                            Lernen
                        </Button>
                    </Box>
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

            <Dialog onClose={() => {
                aborted && aborted();
                setDialogMessage("")
            }}
                    aria-labelledby="dialog-title"
                    open={!!(confirmed && aborted && dialogMessage)}
                    maxWidth={false}
            >
                <DialogTitle id="dialog-title">{dialogTitle}</DialogTitle>
                <DialogContent style={{paddingTop: 0}}>
                    {dialogMessage}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        aborted && aborted();
                        setDialogMessage("");
                    }}>Abbrechen</Button>
                    <Button
                        color="primary"
                        onClick={() => {
                            confirmed && confirmed();
                            setDialogMessage("");
                        }}>OK</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
