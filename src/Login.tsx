import * as React from "react";
import {useEffect} from "react";
import * as msal from "@azure/msal-browser";
import {Button, Grid} from "@material-ui/core";
import {reactContext} from "./Context";
import {Main} from "./layout/Main";

const graphURL = `https://graph.microsoft.com/v1.0`;
const msalConfig = {
    auth: {
        clientId: "8fb151bc-771b-4a24-9a6e-e44e028db48c",
        redirectUri: `http://${window.location.origin}/login`,
    },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);
const request = {
    scopes: ["Files.ReadWrite.AppFolder"],
};

export function Login() {
    const context = React.useContext(reactContext);
    let [token, setToken] = React.useState<string | undefined>();
    useEffect(() => {
        if (token === undefined) {
            msalInstance.acquireTokenSilent(request).then(response => setToken(response.accessToken)).catch(e =>
                console.debug("ignoring failed token request", e));
        }
    }, [token]);

    async function authHeader() {
        if (!token) {
            let tokenResponse;
            try {
                tokenResponse = await msalInstance.acquireTokenSilent(request);
            } catch (e) {
                // fallback to interaction when silent call fails
                tokenResponse = await msalInstance.loginPopup(request);
            }
            console.log("tokenResponse=", tokenResponse);
            setToken(token = tokenResponse.accessToken);
        }
        return {
            "Authorization": "Bearer " + token,
        };
    }

    // const files = useMemo(()=>)

    return (<>
        <Main>
            {!token ?
                <Button variant="contained" onClick={async () => {
                    try {
                        const filesResponse = await fetch(`${graphURL}/drive/special/approot/children`,
                            {
                                headers: await authHeader(),
                            },
                        );
                        console.log("filesResponse=", filesResponse);
                        const body = await filesResponse.json();
                        console.log("filesResponse.body=", body);
                    } catch (e) {
                        // TODO handle error
                        console.error(e);
                    }
                }}>
                    Login with Microsoft Account
                </Button>
                :
                <div>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            Logged in as: {msalInstance.getAccount().name} ({msalInstance.getAccount().userName})
                        </Grid>
                        <Grid item xs={6}>
                            <Button variant="contained" fullWidth onClick={async () => {
                                const uploadResponse = await fetch(`${graphURL}/drive/special/approot:/pupils.json:/content`,
                                    {
                                        method: "PUT",
                                        headers: await authHeader(),
                                        body: JSON.stringify(context.pupils),
                                    });
                                console.log("uploadResponse=", uploadResponse);
                            }}>
                                Upload
                            </Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button variant="contained" fullWidth onClick={async () => {
                                const downloadResponse = await fetch(`${graphURL}/drive/special/approot:/pupils.json:/content`,
                                    {
                                        method: "GET",
                                        headers: await authHeader(),
                                    });
                                console.log("downloadResponse=", downloadResponse);
                                context.pupils = await downloadResponse.json();
                            }}>
                                Download
                            </Button>
                        </Grid>
                    </Grid>
                </div>
            }
        </Main>
    </>);
}

