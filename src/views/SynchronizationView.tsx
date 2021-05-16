import * as React from "react";
import {Box, Button, Grid, Typography} from "@material-ui/core";
import {reactContext} from "../data/Context";
import {Main} from "../layout/Main";
import {VirtualizedTable} from "../components/VirtualizedTable";
import moment from "moment";
import {RemoteState} from "../sync/SynchronizationInfo";

export function SynchronizationView() {
    const context = React.useContext(reactContext);

    const key = "abc";

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
            <Grid container spacing={2}>
                <Grid item xs={12}/>
                <Grid item xs={12}>
                    <Typography variant="h6">Datenstatus</Typography>
                </Grid>
            </Grid>
            <Box flexGrow={1}>
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
            </Box>
        </Main>
    </>);
}

