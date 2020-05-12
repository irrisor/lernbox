/*
documentation:
Login:
https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/acquire-token.md
File access:
https://docs.microsoft.com/de-de/onedrive/developer/rest-api/concepts/special-folders-appfolder?view=odsp-graph-online


management: https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
*/
import {Context} from "../data/Context";
import {SynchronizationInfo, SynchronizationState} from "./SynchronizationInfo";
import * as jsondiffpatch from "jsondiffpatch";
import * as msal from "@azure/msal-browser";

export const graphURL = `https://graph.microsoft.com/v1.0`;
const msalConfig = {
    auth: {
        clientId: "8fb151bc-771b-4a24-9a6e-e44e028db48c",
        redirectUri: `${window.location.origin}/login`,
        postLogoutRedirectUri: `${window.location.origin}/logout`,
        navigateToLoginRequestUrl: false,
    },
};
export const msalInstance = new msal.PublicClientApplication(msalConfig);
export let loginPageOpened = false;

export function setLoginPageOpened(state: boolean) {
    loginPageOpened = state;
}

export function isShareActive() {
    return localStorage.getItem("isShareActive") === "true";
}

export const requestScopes = () => ({
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
            if (loginPageOpened) {
                msalInstance.loginRedirect(requestScopes());
            }
            return;
        }
    }
    console.log("tokenResponse=", tokenResponse);
    setToken(token = tokenResponse.accessToken);
    return token;
}

export const authHeaderFunction = async (token: string | null, setToken: (value: string) => void): Promise<HeadersInit> => {
    if (!token || !msalInstance.getAccount()) {
        token = await requestTokenOrLogin(setToken, token) || null;
    }
    if (!token) {
        return {};
    }
    return {
        "Authorization": "Bearer " + token,
    };
};
const LOCAL_STORAGE_KEY_TOKEN = "msalToken";
export const LOCAL_STORAGE_KEY_MENU_OPEN = "menuOpen";
const LOCAL_STORAGE_KEY_SYNC_INFO = "sync.json";

export function loadToken(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_KEY_TOKEN);
}

export function saveToken(newToken: string | null) {
    if (newToken) {
        localStorage.setItem(LOCAL_STORAGE_KEY_TOKEN, newToken);
    } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_TOKEN);
    }
}

const REMOTE_PREFIX = "remote-";

function synchronizeFile(
    filename: string,
    localData: any,
    usedStorageNames: Set<string>,
    synchronizationInfo?: SynchronizationInfo,
) {
    if (localData !== undefined && localData !== null) {
        localStorage.setItem(filename, JSON.stringify(localData));
    } else {
        localData = JSON.parse(localStorage.getItem(filename) || "null");
    }

    usedStorageNames.add(filename);

    const token = !synchronizationInfo ? undefined : loadToken();
    const remoteKey = REMOTE_PREFIX + filename;
    if (synchronizationInfo) {
        usedStorageNames.add(remoteKey);
        if (token) {
            let shouldUpload = false;
            const persistentObject = synchronizationInfo.get(filename);
            if (!persistentObject) {
                console.error("Skipping file without synchronization entry: " + filename);
                return;
            }
            const lastRemoteDataString = localStorage.getItem(remoteKey);
            const remoteUnchanged = persistentObject.meta.remoteTimestamp && persistentObject.meta.remoteSyncTimestamp &&
                (persistentObject.meta.remoteTimestamp === persistentObject.meta.remoteSyncTimestamp);
            let remoteData: any;
            if (remoteUnchanged && lastRemoteDataString) {
                remoteData = JSON.parse(lastRemoteDataString);
            } else {
                remoteData = persistentObject.remoteContent;
            }
            if (remoteData !== null) {
                if (lastRemoteDataString !== null) {
                    const deltaToLastRemote = remoteUnchanged ? undefined : jsondiffpatch.diff(JSON.parse(lastRemoteDataString), remoteData);
                    if (deltaToLastRemote) {
                        jsondiffpatch.patch(localData, deltaToLastRemote);
                    } else {
                        const deltaToRemote = jsondiffpatch.diff(remoteData, localData);
                        if (deltaToRemote) {
                            persistentObject.meta.localTimestamp = Date.now();
                            shouldUpload = true;
                        }
                        remoteData = localData;
                    }
                } else {
                    console.warn("There is a remote version of the data and we don't know about changes to it. " +
                        "Using it with precedence.", filename, localData, remoteData);
                }
            } else {
                remoteData = localData;
                shouldUpload = true;
            }
            if (shouldUpload) {
                try {
                    localStorage.setItem(filename, JSON.stringify(remoteData));
                    persistentObject.meta.localTimestamp = Date.now();
                    upload(filename, remoteData, token, saveToken).then(uploadResult => {
                        localStorage.setItem(remoteKey, JSON.stringify(remoteData));
                        persistentObject.meta.remoteTimestamp = Date.parse(uploadResult.lastModifiedDateTime);
                        persistentObject.meta.remoteSyncTimestamp = persistentObject.meta.remoteTimestamp;
                    });
                    return remoteData;
                } catch (error) {
                    if (error.status === 409 /*Conflict*/) {
                        console.warn("Upload conflict, trying next time");
                    } else {
                        console.error("Upload failed", error);
                    }
                    return localData;
                }
            }
        }
    }
    return localData;
}

let inSynchronize: boolean;
let intervalId: number;
let synchronizationInfo: SynchronizationInfo;

export function synchronize(context: Context, init?: boolean) {
    if (localStorage.getItem("syncEnabled") === null) return;
    if (inSynchronize) {
        console.error(new Error("Cannot start another synchronization while synchronizing"));
        return;
    }
    inSynchronize = true;

    function syncInfo(usedStorageNames: Set<string>) {
        const existingSynchronizationEntries = init ? undefined : context.synchronizationInfo.objects().map(object => object.meta);
        const synchronizationEntries = (synchronizeFile(
            LOCAL_STORAGE_KEY_SYNC_INFO,
            existingSynchronizationEntries,
            usedStorageNames,
            undefined,
        )) || [];

        if (existingSynchronizationEntries !== synchronizationEntries) {
            for (const entry of synchronizationEntries) {
                const contextEntry = context.synchronizationInfo.get(entry.key)?.meta;
                if (contextEntry) {
                    Object.assign(contextEntry, entry);
                }
            }
        }
        return context.synchronizationInfo;
    }

    try {
        const usedStorageNames = new Set<string>([LOCAL_STORAGE_KEY_MENU_OPEN, LOCAL_STORAGE_KEY_TOKEN]);

        synchronizationInfo = syncInfo(usedStorageNames);

        if (!synchronizationInfo) throw new Error("SynchronizationInfo not found");

        if (!init && !intervalId) {
            intervalId = window.setInterval(async () => {
                const listing = await list(loadToken(), saveToken);
                console.debug("list=", listing);
                if (listing) {
                    for (const entry of listing.value) {
                        const persistentObject = synchronizationInfo.get(entry.name);
                        if (persistentObject && persistentObject.meta.state === SynchronizationState.OK) {
                            download(entry.name, loadToken(), saveToken).then(data => {
                                    persistentObject.remoteContent = data;
                                    persistentObject.meta.state = SynchronizationState.OK;
                                    persistentObject.meta.remoteTimestamp = Date.parse(entry.lastModifiedDateTime);
                                },
                            ).catch(e => {
                                console.error("Download of file failed: ", e);
                                persistentObject.meta.state = SynchronizationState.ERROR;
                            });
                        } else {
                            console.warn("Found a remote file without synchronization entry: " + entry.name)
                        }
                    }
                }
            }, 1000 * 60 * 5 /*every 5 minutes*/);
        }

        context.currentPasswordHash = (synchronizeFile(
            "security_current.json",
            init ? undefined : {hash: context.currentPasswordHash},
            usedStorageNames,
            undefined,
        ))?.hash || "";
        context.teacherPasswordHash =
            (synchronizeFile(
                "security.json",
                init ? undefined : {hash: context.teacherPasswordHash},
                usedStorageNames,
                init ? undefined : synchronizationInfo,
            ))?.hash || "";

        for (const persistentObject of context.synchronizationInfo.objects()) {
            const currentValue = persistentObject.content;
            let syncedValue = synchronizeFile(
                persistentObject.meta.key,
                init ? undefined : currentValue,
                usedStorageNames,
                init ? undefined : synchronizationInfo,
            );
            if (currentValue !== syncedValue && syncedValue) {
                persistentObject.content = syncedValue;
            }
        }

        const localPupilIds = context.pupilsList.map(pupil => pupil.id);
        let pupilIds = synchronizeFile(
            "pupil-ids.json",
            init ? undefined : localPupilIds,
            usedStorageNames,
            init ? undefined : synchronizationInfo,
        );
        if (Array.isArray(pupilIds)) {
            for (const pupilId of pupilIds) {
                const localPupil = context.pupilsList.find(pupil => pupil.id === pupilId);
                let remotePupil = synchronizeFile(
                    `pupil-${pupilId}.json`,
                    init ? undefined : localPupil,
                    usedStorageNames,
                    init ? undefined : synchronizationInfo,
                );
                if (localPupil !== remotePupil && remotePupil) {
                    context.setPupil(pupilId, remotePupil);
                }
            }
        }
        if (init && !pupilIds) {
            let legacyPupils = init && synchronizeFile(
                "pupils.json",
                undefined,
                usedStorageNames,
                undefined,
            );
            if (legacyPupils) {
                // context.pupils = legacyPupils;
            }
        }
        if (!init) {
            const token = loadToken();
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !usedStorageNames.has(key)) {
                    console.debug("unused local storage key: " + key);
                    if (key.indexOf("pupil-") === 0 && token) {
                        try {
                            remove(key, token, saveToken).then(() => {
                                localStorage.removeItem(key);
                                localStorage.removeItem(REMOTE_PREFIX + key);
                            }).catch(e => console.error("Failed to remove storage file " + key, e));
                        } catch (e) {
                            console.error("Failed to remove file remotely", key, e);
                        }
                    }
                }
            }
        }
        syncInfo(usedStorageNames);
    } finally {
        inSynchronize = false;
    }
}

export async function upload(filename: string, value: any, token: string | null, setToken: (token: string) => void) {
    const uploadResponse = await fetch(`${graphURL}/drive/special/approot:/${filename}:/content`,
        {
            method: "PUT",
            headers: await authHeaderFunction(token, setToken),
            body: JSON.stringify(value),
        });
    console.debug("uploadResponse=", uploadResponse);
    if (uploadResponse.status !== 200 && uploadResponse.status !== 201 /*Created*/) {
        throw uploadResponse;
    }
    return await uploadResponse.json();
}

async function remove(filename: string, token: string | null, setToken: (token: string) => void) {
    const removeResponse = await fetch(`${graphURL}/drive/special/approot:/${filename}:/content`,
        {
            method: "DELETE",
            headers: await authHeaderFunction(token, setToken),
        });
    console.debug("removeResponse=", removeResponse);
    if (removeResponse.status !== 200 && removeResponse.status !== 404 /*not found is ok - probably already deleted*/) {
        throw removeResponse;
    }
}

interface ListResponse {
    value: Array<{
        "@microsoft.graph.downloadUrl": string,
        name: string,
        eTag: string;
        lastModifiedDateTime: string;
        size: number;
        webUrl: string;
        file: {
            hashes: {
                sha1Hash: string;
            }
        }
    }>
}

export async function list(token: string | null, setToken: (token: string | null) => void): Promise<ListResponse | null> {
    const downloadResponse = await fetch(`${graphURL}/drive/special/approot/children`,
        {
            method: "GET",
            headers: await authHeaderFunction(token, setToken),
        });
    console.debug("listResponse=", downloadResponse);
    if (downloadResponse.status !== 200) {
        if (downloadResponse.status === 401) {
            setToken(null);
        }
        if (downloadResponse.status === 404) {
            return null;
        }
        throw downloadResponse;
    }
    try {
        return await downloadResponse.json();
    } catch (error) {
        console.error(`Error listing approot.`, error);
        throw error;
    }
}

export async function download(filename: string, token: string | null, setToken: (token: string | null) => void) {
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
        if (downloadResponse.status === 404) {
            return null;
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