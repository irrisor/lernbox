import * as React from "react";
import {useEffect} from "react";
import {Box, Button, Grid, Typography} from "@material-ui/core";
import {reactContext} from "../data/Context";
import {Main} from "../layout/Main";
import {VirtualizedTable} from "../components/VirtualizedTable";
import moment from "moment";
import {
    authHeaderFunction,
    graphURL,
    isShareActive,
    loadToken,
    msalInstance,
    requestScopes,
    saveToken,
    setLoginPageOpened,
    synchronize,
} from "../sync/synchronize";

export function SynchronizationView() {
    const context = React.useContext(reactContext);
    let [token, setToken] = React.useState<string | null>(loadToken());

    function setAndSaveToken(newToken: string | null) {
        setToken(newToken);
        if (newToken) {
            saveToken(newToken);
        }
    }

    React.useEffect(() => {
        msalInstance.handleRedirectCallback((redirectError: any, redirectResponse: any) => {
            if (redirectError) {
                console.error("Login via redirect failed", redirectError);
            } else {
                const newToken = redirectResponse && redirectResponse.accessToken;
                setAndSaveToken(newToken);
            }
        });
        setLoginPageOpened(true);
        return () => {
            setLoginPageOpened(false);
        }
    }, []);
    useEffect(() => {
        if (!token) {
            msalInstance.acquireTokenSilent(requestScopes()).then(response => setAndSaveToken(response.accessToken)).catch(e =>
                console.debug("ignoring failed token requestScopes", e));
        }
    }, [token]);

    const [sharedWithMe, setSharedWithMe] = React.useState<any>();
    useEffect(() => {
        if (token && isShareActive()) {
            (async () => {
                const sharedWithMeResponse = await fetch(`${graphURL}/me/drive/sharedWithMe`,
                    {headers: await authHeaderFunction(token, setAndSaveToken)},
                );
                const body = await sharedWithMeResponse.json();
                console.log("sharedWithMeBody=", body);
                setSharedWithMe(body.value);
            })()
        }
    }, [token]);

    React.useEffect(() => {
        (async () => {
            const response = await fetch("http://localhost:7071/api/GetPupilData?name=Christian");
            console.log("function response was ", await response.text());
        })();
    });

    return (<>
        <Main>
            {!token || !msalInstance.getAccount() ? <>
                    <Typography variant="h4">Datensynchronisation mit OneDrive</Typography>
                    <p>
                        Um die gleichen Daten (Karten und Schüler mit deren Fächern) an mehreren Orten zu verwenden,
                        können diese im Netzwerk gespeichert werden. Hierzu wird Microsoft OneDrive verwendet.
                        Um dies zu aktivieren, muss man sich mit einem Microsoft Konto (z.B. von Windows 10) anmelden.
                        Klicke auf den folgenden Button, um Lernbox den Zugriff auf einen eigens für die Anwendung
                        erstellten Ordner zu gewähren.
                    </p>
                    <Button variant="contained" onClick={async () => {
                        try {
                            const headers = await authHeaderFunction(token, setAndSaveToken);
                            const filesResponse = await fetch(`${graphURL}/drive/special/approot/children`,
                                {headers},
                            );
                            console.log("filesResponse=", filesResponse);
                            const body = await filesResponse.json();
                            console.log("filesResponse.body=", body);
                        } catch (e) {
                            // TODO handle error
                            console.error(e);
                        }
                    }}>
                        Login mit Microsoft Account
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
                                    {msalInstance.getAccount().name} ({msalInstance.getAccount().userName})
                                </Grid>
                                <Grid item xs={4}>
                                    <Button fullWidth onClick={() => {
                                        setAndSaveToken(null);
                                        msalInstance.logout();
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
                            {Array.isArray(sharedWithMe) && sharedWithMe.map(entry => <div>
                                {entry.remoteItem.name}
                            </div>)}
                        </Grid>
                        <Grid item xs={12}>
                            Synchronisation ist aktiv.
                            <Button fullWidth onClick={() => synchronize(context)}>Jetzt ausführen</Button>
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
                        const entry = context.synchronizationInfo.objects()[row.index].meta;
                        return {
                            key: entry.key,
                            localDate: entry.localTimestamp ? moment(entry.localTimestamp).fromNow() : "",
                            remoteDate: entry.remoteTimestamp ? moment(entry.remoteTimestamp).fromNow() : "",
                        };
                    }}
                    columns={[
                        {
                            label: "Datei",
                            dataKey: "key",
                            width: 600,
                        },
                        {
                            label: "Lokal",
                            dataKey: "localDate",
                            width: 200,
                        },
                        {
                            label: "Remote",
                            dataKey: "remoteDate",
                            width: 200,
                        },
                    ]}

                />
            </Box>
        </Main>
    </>);
}

