import * as React from "react";
import {useEffect, useMemo} from "react";
import * as msal from "@azure/msal-browser";
import {Button} from "@material-ui/core";
import {reactContext} from "./Context";
import {Main} from "./layout/Main";

const graphURL = `https://graph.microsoft.com/v1.0`;
const msalConfig = {
    auth: {
        clientId: "8fb151bc-771b-4a24-9a6e-e44e028db48c",
        redirectUri: "http://localhost:3000/login",
    },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

export function Login() {
    const context = React.useContext(reactContext);
    let [token, setToken] = React.useState<string | undefined>();
    const request = {
        scopes: ["Files.ReadWrite.AppFolder"],
    };
    useEffect(() => {
        if (token === undefined) {
            msalInstance.acquireTokenSilent(request).then(response => setToken(response.accessToken));
        }
    }, [token === undefined]);

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

                        const uploadResponse = await fetch(`${graphURL}/drive/special/approot:/pupils.json:/content`,
                            {
                                method: "PUT",
                                headers: await authHeader(),
                                body: JSON.stringify(context.pupils),
                            });
                    } catch (e) {
                        // TODO handle error
                        console.error(e);
                    }
                }}>
                    Login with Microsoft Account
                </Button>
                :
                <div>
                    Logged in as: {msalInstance.getAccount().name} ({msalInstance.getAccount().userName})
                </div>
            }
        </Main>
    </>);
}

