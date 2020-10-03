import * as React from "react";
import {useEffect} from "react";
import {DEFAULT_SCHOOL_ID, DEFAULT_TEACHER_ID, reactContext} from "../data/Context";
import {useParams} from "react-router";
import {Button, Grid, TextField, Typography} from "@material-ui/core";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {sha256} from "js-sha256";
import {onEnterPressed} from "./Question";
import {v4 as uuidv4} from 'uuid';

export function LoginView() {
    const context = React.useContext(reactContext);
    const {schoolId, teacherId, readKey, pupilId, key} = useParams();
    useEffect(() => {
        if (
            (schoolId && context.schoolId !== schoolId) ||
            (teacherId && context.teacherId !== teacherId) ||
            (key && context.currentPasswordHash !== key) ||
            (pupilId && context.currentPupilId !== pupilId) ||
            (readKey && context.readPasswordHash !== readKey)
        ) {
            context.update(newContext => {
                if (schoolId) {
                    newContext.schoolId = schoolId;
                }
                if (teacherId) {
                    newContext.teacherId = teacherId;
                }
                if (key) {
                    newContext.currentPasswordHash = key;
                }
                if (pupilId) {
                    if (readKey) {
                        newContext.readPasswordHash = readKey;
                    }
                    newContext.currentPupilId = pupilId;
                    context.history.push("/pupil/logged-in/" + pupilId);
                }
            });
        }
    }, [context, schoolId, teacherId, key, pupilId, readKey]);
    const [id, setId] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [message, setMessage] = React.useState("Anmelden");

    const header = (<>
        <Typography variant="h4">Lehrerkonto</Typography>
        <p>Um Karten und Lernstandsdaten auf mehreren Geräten zu nutzen, können diese auf dem Server gespeichert
            werden.</p>
    </>);
    if (context.schoolId === DEFAULT_SCHOOL_ID) {
        return (
            <Main>
                {header}
                <p>Dazu ist es notwendig, dass du für deine Schule einen Link erhältst. Sofern du diesen
                    bereits hast, rufe ihn bitte auf. Ansonsten wenden dich an den Betreuer von Lernbox
                    an deiner Schule.</p>
            </Main>
        );
    }

    const signIn = async (id: string, password: string) => {
        setId("");
        setPassword("");
        setMessage("...");
        const teacherKey = sha256(password);
        const newReadKey = sha256(uuidv4()).substring(0, 6);
        const headers: HeadersInit = {
            "Authorization": "Bearer " + teacherKey,
        };
        const fileName = "/api/" + context.apiFileNameTeacherData(id);
        const checkResponse = await fetch(fileName, {
            method: "GET",
            headers,
        });

        function loggedIn(created: boolean) {
            return context.update(context => {
                context.teacherId = id;
                if (created) {
                    context.teacherPasswordHash = teacherKey;
                    context.readPasswordHash = newReadKey;
                }
                context.currentPasswordHash = teacherKey;
                context.history.push("/");
            });
        }

        switch (checkResponse.status) {
            case 404: // Not Found
                console.debug("teacher account not found - creating it", checkResponse);
                const headers: HeadersInit = {
                    // "Authorization": "Bearer " + key,
                    "Authorization": "Basic " + btoa(":" + password),
                };
                const directoryPath = fileName.substring(0, fileName.lastIndexOf("/"));
                const createResponse = await fetch(directoryPath, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        access: {
                            write_key: teacherKey,
                            read_key: newReadKey,
                        },
                    }),
                });

                switch (createResponse.status) {
                    case 200: // OK
                        console.debug("teacher account created", createResponse);
                        loggedIn(true);
                        break;
                    case 403: // Access Denied
                        console.debug("create teacher account reports wrong key", createResponse);
                        setMessage("Passwort nicht akzeptiert");
                        break;
                    default:
                        console.debug("created teacher account failed", createResponse);
                        setMessage("Serverfehler");
                        break;
                }
                break;
            case 403: // Access Denied
                console.debug("check teacher account reports wrong password", checkResponse);
                setMessage("Passwort nicht akzeptiert");
                break;
            case 200: // OK
                console.debug("teacher account logged in", checkResponse);
                const updatedContext = loggedIn(false);
                await Promise.all(updatedContext.synchronizationInfo.objects().map(object => object.loadRemote(teacherKey)));
                break;
            default:
                console.debug("check teacher account failed", checkResponse);
                setMessage("Serverfehler");
                break;
        }
    };

    if (context.teacherId === DEFAULT_TEACHER_ID) {
        return (<>
            <Main>
                {header}
                <p>Gib bitte deinen WebWeaver Benutzernamen sowie dein Passwort dazu ein, um dich einzuloggen bzw. ein
                    Konto
                    zu erstellen.</p>

                <form noValidate autoComplete="off">
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField label="WebWeaver Login / Benutzername"
                                       autoFocus
                                       type="text"
                                       value={id}
                                       onChange={event => {
                                           setId(event.target.value);
                                           setMessage("Anmelden");
                                       }}
                                       fullWidth
                                       autoComplete="login"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField label="WebWeaver Serverpasswort"
                                       type="password"
                                       value={password}
                                       onChange={event => setPassword(event.target.value)}
                                       fullWidth
                                       autoComplete="server-password"
                                       onKeyPress={onEnterPressed(() => signIn(id, password))}
                            />
                        </Grid>
                        <Grid item xs={12}>
                        </Grid>
                    </Grid>
                </form>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => signIn(id, password)}
                        disabled={!id || !password}
                    >
                        {message}
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>);
    }
    return <>
        Schule: {context.schoolId || "ohne"}, Lehrer/in: {context.teacherId||"ohne"},
        Schüler/in: {(context.pupil && context.pupil.name) || context.currentPupilId || "ohne"}
    </>;
}
