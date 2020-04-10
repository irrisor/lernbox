import * as React from "react";
import {useEffect} from "react";
import * as msal from "@azure/msal-browser";
import {Button, Grid, Typography} from "@material-ui/core";
import {reactContext} from "./Context";
import {Main} from "./layout/Main";

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

const authHeaderFunction = async (token: string | null, setToken: (value: string) => void) => {
    if (!token || !msalInstance.getAccount()) {
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
        localStorage.setItem("msalToken", token);
    }
    return {
        "Authorization": "Bearer " + token,
    };
};

export function Login() {
    const context = React.useContext(reactContext);
    let [token, setToken] = React.useState<string | null>(localStorage.getItem("msalToken"));
    React.useEffect(() => {
        msalInstance.handleRedirectCallback((redirectError: any, redirectResponse: any) => {
            if (redirectError) {
                console.error("Login via redirect failed", redirectError);
                redirectError = undefined;
            } else {
                const newToken = redirectResponse && redirectResponse.accessToken;
                setToken(newToken);
                if (newToken) {
                    localStorage.setItem("msalToken", newToken);
                }
            }
        });
    }, []);
    useEffect(() => {
        if (token === undefined) {
            msalInstance.acquireTokenSilent(requestScopes()).then(response => setToken(response.accessToken)).catch(e =>
                console.debug("ignoring failed token requestScopes", e));
        }
    }, [token]);

    const [sharedWithMe, setSharedWithMe] = React.useState<any>();
    useEffect(() => {
        if (token && isShareActive()) {
            (async () => {
                const sharedWithMeResponse = await fetch(`${graphURL}/me/drive/sharedWithMe`,
                    {headers: await authHeaderFunction(token, setToken)},
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
                            const headers = await authHeaderFunction(token, setToken);
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
                                <Grid item xs={8} style={{flexDirection: "column", justifyContent: "center", display: "flex"}}>
                            {msalInstance.getAccount().name} ({msalInstance.getAccount().userName})
                                </Grid>
                                <Grid item xs={4}>
                                    <Button fullWidth onClick={()=>{
                                        setToken(null);
                                        localStorage.removeItem("msalToken");
                                        msalInstance.logout();
                                    }}>
                                        Abmelden
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={6}>
                            <Button variant="contained" fullWidth onClick={async () => {
                                const uploadResponse = await fetch(`${graphURL}/drive/special/approot:/pupils.json:/content`,
                                    {
                                        method: "PUT",
                                        headers: await authHeaderFunction(token, setToken),
                                        body: JSON.stringify(context.pupils),
                                    });
                                console.log("uploadResponse=", uploadResponse);
                            }}>
                                Hochladen
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button variant="contained" fullWidth onClick={async () => {
                                const downloadResponse = await fetch(`${graphURL}/drive/special/approot:/pupils.json:/content`,
                                    {
                                        method: "GET",
                                        headers: await authHeaderFunction(token, setToken),
                                    });
                                console.log("downloadResponse=", downloadResponse);
                                context.pupils = await downloadResponse.json();
                            }}>
                                Herunterladen
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            {Array.isArray(sharedWithMe) && sharedWithMe.map(entry => <div>
                                {entry.remoteItem.name}
                            </div>)}
                        </Grid>
                    </Grid>
                </div>
            }
        </Main>
    </>);
}

