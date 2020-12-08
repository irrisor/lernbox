import * as React from "react";
import {DEFAULT_TEACHER_ID, reactContext} from "../data/Context";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {Box, Button, Grid, TextField, Typography} from "@material-ui/core";
import {onEnterPressed} from "./Question";

export function PasswordView({passwordName, currentPasswordHash, apply, who, override}: {
    passwordName: string,
    currentPasswordHash: string,
    apply: (newPassword: string) => void,
    who: string,
    override?: boolean
}) {
    const context = React.useContext(reactContext);
    const [change, setChange] = React.useState(!currentPasswordHash || override);
    const [password, setPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmedPassword, setConfirmedPassword] = React.useState("");
    const [error, setError] = React.useState("");
    const okPressed = () => {
        const hash = context.passwordHash(password);
        if (!override && currentPasswordHash && hash !== currentPasswordHash) {
            setError("Das Passwort stimmt nicht mit dem aktuell gesetzten überein.");
            setPassword("");
            return;
        }
        if (change) {
            if (!override && newPassword !== confirmedPassword) {
                setError("Das neue Passwort und dessen Wiederholung stimmen nicht überein. Bitte gebe beide " +
                    "nocheinmal ein.");
                setNewPassword("");
                setConfirmedPassword("");
                return;
            }
            setError("");
            apply(newPassword);
            setChange(false);
        } else {
            setError("");
            apply(password);
            setChange(true);
        }
    };
    return (<>
        <Main>
            <Box height="10em">
                <Typography variant="h4">Passwortschutz</Typography>
                {change ?
                    <p>Setze ein neues Passwort, das nur {who} kennt.
                        Achtung, Lehrer können die Passworte der Schüler einsehen!
                    </p>
                    :
                    <p>Für diese Funktion ist das {passwordName} erforderlich.</p>
                }
                {error && <Typography color="secondary">{error}</Typography>}
            </Box>
            <form noValidate autoComplete="off">
                <Grid container spacing={2}>
                    <input type="text" name="username" autoComplete={"username"} value={who}
                           style={{display: "none"}} readOnly/>

                    {currentPasswordHash && !override &&
                    <Grid item xs={12}><TextField label={change ? "Bisheriges " + passwordName : passwordName}
                                                  autoFocus
                                                  type="password"
                                                  value={password}
                                                  onChange={event => setPassword(event.target.value)}
                                                  onKeyPress={onEnterPressed(okPressed)}
                                                  fullWidth
                                                  autoComplete="current-password"
                    /></Grid>
                    }
                    {change && <>
                        <Grid item xs={12}><TextField label={"Neues " + passwordName}
                                                      autoFocus={!currentPasswordHash || override}
                                                      type={override ? "text" : "password"}
                                                      value={newPassword}
                                                      onChange={event => setNewPassword(event.target.value)}
                                                      onKeyPress={onEnterPressed(okPressed)}
                                                      fullWidth
                                                      autoComplete="new-password"
                        /></Grid>
                        {!override && <Grid item xs={12}><TextField label={`Neues ${passwordName} wiederholt`}
                                                                    type="password"
                                                                    value={confirmedPassword}
                                                                    onChange={event => setConfirmedPassword(event.target.value)}
                                                                    onKeyPress={onEnterPressed(okPressed)}
                                                                    fullWidth
                                                                    autoComplete="confirmed-password"
                        /></Grid>}
                    </>
                    }
                </Grid>
            </form>
        </Main>
        <BottomGridContainer>
            <Grid item xs={12}>
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={okPressed}
                >
                    Eingeben
                </Button>
            </Grid>
            {!change && <Grid item xs={12}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={() => setChange(true)}
                >
                    Passwort ändern
                </Button>
            </Grid>}
            {!override && <Grid item xs={12}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={() => context.history.push("/")}
                >
                    Schüler wechseln
                </Button>
            </Grid>}
        </BottomGridContainer>
    </>);
}

export function TeacherPasswordView() {
    const context = React.useContext(reactContext);
    return <PasswordView
        passwordName={"Lehrerpasswort" +
        (context.teacherId !== DEFAULT_TEACHER_ID ? ` (von ${context.teacherId})` : "")}
        currentPasswordHash={context.teacherPasswordHash}
        apply={newPassword => {
            context.update(newContext => {
                const newHash = newContext.passwordHash(newPassword);
                newContext.teacherPasswordHash = newHash;
                newContext.currentPasswordHash = newHash;
            });
        }}
        who="die Lehrkraft"
    />;
}

export function PupilPasswordView() {
    const context = React.useContext(reactContext);
    return <PasswordView
        passwordName={context.pupil?.name ? `Passwort von ${context.pupil.name}` : "Schülerpasswort"}
        currentPasswordHash={context.passwordHash(context.pupil?.password)}
        apply={newPassword => {
            context.update(newContext => {
                const newHash = newContext.passwordHash(newPassword);
                if (newContext.pupil) {
                    newContext.pupil = Object.assign({}, newContext.pupil, {password: newPassword});
                }
                if (!context.isTeacher) {
                    newContext.currentPasswordHash = newHash;
                } else {
                    context.history.push("/teacher");
                }
            });
        }}
        who={context.pupil?.name || "der Schüler"}
        override={context.isTeacher}
    />;
}

