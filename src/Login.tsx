import * as React from "react";
import {useEffect} from "react";
import * as msal from "@azure/msal-browser";
import {Button, Grid, Typography} from "@material-ui/core";
import {Context, reactContext} from "./Context";
import {Main} from "./layout/Main";
import * as jsondiffpatch from "jsondiffpatch";

/*
documentation:
Login:
https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/acquire-token.md
File access:
https://docs.microsoft.com/de-de/onedrive/developer/rest-api/concepts/special-folders-appfolder?view=odsp-graph-online


management: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
*/
const graphURL = `https://graph.microsoft.com/v1.0`;
const msalConfig = {
    auth: {
        clientId: "8fb151bc-771b-4a24-9a6e-e44e028db48c",
        redirectUri: `${window.location.origin}/login`,
        postLogoutRedirectUri: `${window.location.origin}/logout`,
        navigateToLoginRequestUrl: false,
    },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

function isShareActive() {
    return localStorage.getItem("isShareActive") === "true";
}

const requestScopes = () => ({
    scopes: ["Files.ReadWrite.AppFolder"].concat(isShareActive() ?
        ["Files.Read.All", "Files.ReadWrite.All", "Sites.Read.All", "Sites.ReadWrite.All"] : []),
});

async function requestTokenOrLogin(setToken: (value: string) => void, token: string | null) {
    let tokenResponse;
    try {
        tokenResponse = await msalInstance.acquireTokenSilent(requestScopes());
    } catch (e) {
        // fallback to interaction when silent call fails
        try {
            tokenResponse = await msalInstance.loginPopup(requestScopes());
        } catch (e2) {
            msalInstance.loginRedirect(requestScopes());
            return;
        }
    }
    console.log("tokenResponse=", tokenResponse);
    setToken(token = tokenResponse.accessToken);
    return token;
}

const authHeaderFunction = async (token: string | null, setToken: (value: string) => void): Promise<HeadersInit> => {
    if (!token || !msalInstance.getAccount()) {
        token = await requestTokenOrLogin(setToken, token) || null;
    }
    if (!token )
    {
        return {};
    }
    return {
        "Authorization": "Bearer " + token,
    };
};

const LOCAL_STORAGE_KEY_TOKEN = "msalToken";

function loadToken(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);
}

function saveToken(newToken: string | null) {
    if (newToken) {
        localStorage.setItem(LOCAL_STORAGE_KEY_TOKEN, newToken);
    } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
    }
}

async function synchronizeFile(filename: string, localData: any) {
    if (localData) {
        localStorage.setItem(filename, JSON.stringify(localData));
    } else {
        localData = JSON.parse(localStorage.getItem(filename) || "null");
    }
    const token = loadToken();
    if (token) {
        let remoteData = await download(filename, token, saveToken);
        const remoteKey = "remote-" + filename;
        if (remoteData !== null) {
            const lastRemoteData = localStorage.getItem(remoteKey);
            if (lastRemoteData !== null) {
                const deltaToLastRemote = jsondiffpatch.diff(JSON.parse(lastRemoteData), localData);
                if (deltaToLastRemote) {
                    jsondiffpatch.patch(remoteData, deltaToLastRemote);
                } else {
                    const deltaToRemote = jsondiffpatch.diff(remoteData, localData);
                    if (!deltaToRemote) {
                        remoteData = localData;
                    }
                }
            } else {
                remoteData = Object.assign(remoteData, localData);
            }
        } else {
            remoteData = localData;
        }
        try {
            await upload(filename, remoteData, token, saveToken);
            localStorage.setItem(remoteKey, JSON.stringify(remoteData));
            return remoteData;
        } catch (error) {
            if (error.status === 409 /*Conflict*/) {
                console.warn("Upload conflict, trying next time");
            } else {
                console.error("Upload failed", error);
            }
            return localData;
        }
    } else {
        return localData;
    }
}

export async function synchronize(context: Context, init?: boolean) {
    let remoteData = await synchronizeFile("pupils.json", init ? undefined : context.pupils);
    if (context.pupils !== remoteData && remoteData) {
        context.pupils = remoteData;
    }
}

async function upload(filename: string, value: any, token: string | null, setToken: (token: string) => void) {
    const uploadResponse = await fetch(`${graphURL}/drive/special/approot:/${filename}:/content`,
        {
            method: "PUT",
            headers: await authHeaderFunction(token, setToken),
            body: JSON.stringify(value),
        });
    console.debug("uploadResponse=", uploadResponse);
    if (uploadResponse.status !== 200) {
        throw uploadResponse;
    }
}

async function download(filename: string, token: string | null, setToken: (token: string | null) => void) {
    const downloadResponse = await fetch(`${graphURL}/drive/special/approot:/${filename}:/content`,
        {
            method: "GET",
            headers: await authHeaderFunction(token, setToken),
        });
    console.debug("downloadResponse=", downloadResponse);
    if (downloadResponse.status !== 200) {
        if (downloadResponse.status === 401) {
            setToken(null);
        }
        throw downloadResponse;
    }
    try {
        return await downloadResponse.json();
    } catch (error) {
        console.error(`Error downloading ${filename}.`, error);
        throw error;
    }
}

export function Login() {
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
    }, []);
    useEffect(() => {
        if (token === undefined) {
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

    // const files = useMemo(()=>)

    return (<>
        <Main>
            {!token || !msalInstance.getAccount() ? <>
                    <Typography variant="h4">Datensynchronisation mit OneDrive</Typography>
                    <p>
                        Um die gleichen Daten (Karten und Schüler mit deren Fächern) an mehreren Orten zu verwenden
                        können diese in Netzwerk gesprechert werden. Hierzu wird Microsoft OneDrive verwenden.
                        Dazu muss man sich mit einem Microsoft Konto (z.B. von Windows 10) anmelden.
                        Klicke auf folgenden Button, um Lernbox den Zugriff auf einen eigens für die Anwendung erstellten
                        Ordner zu gewähren.
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
                                    await upload("pupils.json", context.pupils, token, setAndSaveToken);
                                }}>
                                    Hochladen
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button variant="contained" fullWidth onClick={async () => {
                                    context.pupils = await download("pupils.json", token, setAndSaveToken);
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
                        </Grid>
                    </Grid>
                </div>
            }
        </Main>
    </>);
}

