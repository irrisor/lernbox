import * as React from "react";
import {Box, Button, Grid, Typography} from "@material-ui/core";
import {reactContext} from "../data/Context";
import {Main} from "../layout/Main";
import {VirtualizedTable} from "../components/VirtualizedTable";
import moment from "moment";
import {RemoteState} from "../sync/SynchronizationInfo";
import Tabs from '@material-ui/core/Tabs';
import Tab from "@material-ui/core/Tab";

const logs: Array<["log" | "error" | "debug" | "warn" | string, any[]]> = [];
for (const func of ["log", "error", "debug", "warn"]) {
    const originalFunc: typeof console.log = (console as any)[func];
    (console as any)[func] = function (...args: any) {
        originalFunc.apply(console, args);
        if (logs.length > 100) logs.shift();
        logs.push([func, args]);
    };
}

export function SynchronizationView() {
    const context = React.useContext(reactContext);

    const key = "abc";
    const [activeTab, setActiveTab] = React.useState(0);

    return (<>
        <Main>
            {!key ? <>
                    <Typography variant="h4">Datensynchronisation</Typography>
                    <p>
                        Um die gleichen Daten (Karten und Schüler mit deren Fächern) an mehreren Orten zu verwenden,
                        können diese auf dem Server gespeichert werden. Hierzu wird ein Passwort benötigt.
                        ...
                    </p>
                    <Button variant="contained" disabled onClick={async () => {
                    }}>
                        Login
                    </Button>
                </>
                :
                <div>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="h6">Konto</Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={8}
                                      style={{flexDirection: "column", justifyContent: "center", display: "flex"}}>
                                    Name
                                </Grid>
                                <Grid item xs={4}>
                                    <Button fullWidth onClick={() => {
                                    }}>
                                        Abmelden
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                        {localStorage.getItem("uploadButtons") && <>
                            <Grid item xs={6}>
                                <Button variant="contained" fullWidth onClick={async () => {
                                    // await upload("pupils.json", context.pupilsList, token, setAndSaveToken);
                                }}>
                                    Hochladen
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button variant="contained" fullWidth onClick={async () => {
                                    // context.pupils = await download("pupils.json", token, setAndSaveToken);
                                }}>
                                    Herunterladen
                                </Button>
                            </Grid>
                        </>}
                        <Grid item xs={12}>
                            Synchronisation ist aktiv.
                            <Button fullWidth onClick={() => {
                                context.synchronizationInfo.objects().forEach(object => {
                                    object.meta.remoteState = RemoteState.IN_SYNC;
                                    const previousContent = object.content;
                                    if (object.meta.remoteConflictHash) {
                                        object.meta.remoteHash = object.meta.remoteConflictHash;
                                    }
                                    object.content = previousContent;
                                });
                            }
                            }>
                                Hochladen forcieren
                            </Button>
                        </Grid>
                    </Grid>
                </div>
            }
            <Tabs value={activeTab}
                  onChange={(event, newTab) => setActiveTab(newTab)}
                  aria-label="tabs"
                  style={{marginBottom: 8}}
                  variant="scrollable"
                  scrollButtons="auto"
            >
                <Tab label="Datenstatus" id="status-tab" aria-label="Datenstatus"/>
                <Tab label="Protokoll" id="log-tab" aria-label="Protokoll"/>
            </Tabs>
            {activeTab === 0 && <Box flexGrow={1}>
                <VirtualizedTable
                    rowCount={context.synchronizationInfo.objects().length}
                    rowGetter={row => {
                        const object = context.synchronizationInfo.objects()[row.index];
                        const entry = object.meta;
                        return {
                            key: entry.key,
                            localDate: entry.localTimestamp ? moment(entry.localTimestamp).fromNow() : "",
                            remoteDate: entry.remoteTimestamp ? moment(entry.remoteTimestamp).fromNow() : "",
                            localState: entry.localState,
                            remoteState: entry.remoteState,
                            description: object.description,
                        };
                    }}
                    columns={[
                        {
                            label: "Beschreibung",
                            dataKey: "description",
                            width: 300,
                        },
                        {
                            label: "Lokal",
                            dataKey: "localDate",
                            width: 200,
                        },
                        {
                            label: "Status",
                            dataKey: "localState",
                            width: 200,
                        },
                        {
                            label: "Remote",
                            dataKey: "remoteDate",
                            width: 200,
                        },
                        {
                            label: "Status",
                            dataKey: "remoteState",
                            width: 200,
                        },
                    ]}

                />
            </Box>}
            {activeTab === 1 && <Box flexGrow={1}>
                <VirtualizedTable
                    rowCount={logs.length}
                    rowGetter={row => {
                        const entry = logs[row.index];
                        return {
                            severity: entry[0],
                            log: entry[1].join(" "),
                        };
                    }}
                    rowStyle={(info) => {
                        const entry = logs[info.index] || ["", ""];
                        return ({
                            background:
                                entry[0] === "debug" ? "#D0D0D0" :
                                    entry[0] === "warn" ? "#FFFFB0" :
                                        entry[0] === "error" ? "#FFB0B0" :
                                            "white",
                        });
                    }}
                    columns={[
                        {
                            label: "Level",
                            dataKey: "severity",
                            width: 100,
                        },
                        {
                            label: "Log",
                            dataKey: "log",
                            width: 600,
                        },
                    ]}
                />
            </Box>}
        </Main>
    </>);
}

