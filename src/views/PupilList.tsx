import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import * as React from "react";
import {MouseEvent} from "react";
import {Context, DEFAULT_TEACHER_ID, reactContext} from "../data/Context";
import AccountCircle from "@material-ui/icons/AccountCircle";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {
    Box,
    Button,
    Chip,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Link,
    TextField,
    Tooltip,
} from "@material-ui/core";
import {Pupil} from "../data/Pupil";
import {Group, Lock, LockOpen, PersonAdd, Refresh} from "@material-ui/icons";
import {randomFrom} from "../img/svgs";
import {words} from "../data/words";
import {sha256} from "js-sha256";
import {useParams} from "react-router";
import {onEnterPressed} from "./Question";
import Dialog from "@material-ui/core/Dialog";

function randomPupilPassword() {
    return randomFrom(words).toLowerCase() + Math.floor(Math.random() * 90 + 10);
}

function accessLink(context: Context, pupil?: Pupil) {
    return new URL(`/login/${context.schoolId}/${context.teacherId}/${
        context.readPasswordHash}/${pupil?.id}/${sha256(pupil?.password || "")}`, document.location.href).href;
}

export function PupilList(props: { create?: boolean }) {
    const context = React.useContext(reactContext);
    const {pupilGroupName} = useParams();
    const pupilGroup = context.pupilGroups.find(group => group.group_id === pupilGroupName);
    React.useEffect(() => context.currentPupilId = undefined, [context.currentPupilId]);
    const [newName, setNewName] = React.useState("");
    const [newPassword, setNewPassword] = React.useState(randomPupilPassword());
    const createPupil = (name: string, password: string, id?: string) => {
        if (name !== "") {
            context.createPupil(name, password, id);
            setNewName("");
            setNewPassword(randomPupilPassword());
        }
    };
    let onPasswordChip = false;
    const [accessLinkPupil, setAccessLinkPupil] = React.useState<Pupil | undefined>();
    return (
        <>
            <Main>
                <Dialog onClose={() => setAccessLinkPupil(undefined)}
                        aria-labelledby="dialog-title"
                        open={!!accessLinkPupil}
                        maxWidth={false}
                >
                    <DialogTitle id="dialog-title">Zugangslink für {accessLinkPupil?.name}</DialogTitle>
                    <DialogContent style={{paddingTop: 0}}>
                        {accessLink(context, accessLinkPupil)}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => {
                            setAccessLinkPupil(undefined);
                        }}>Abbrechen</Button>
                        <Button
                            color="primary"
                            onClick={() => {
                                navigator.clipboard.writeText(accessLink(context, accessLinkPupil));
                                setAccessLinkPupil(undefined);
                            }}>Kopieren</Button>
                    </DialogActions>
                </Dialog>
                <List component="nav" aria-label="main mailbox folders" style={{width: "100%"}}>
                    {context.pupilsList.map((pupil: Pupil) => (
                        <ListItem button key={pupil.id}
                                  onClick={() => {
                                      if (!onPasswordChip) context.history.push(`/pupil/${pupil.name}/${pupil.id}`);
                                  }}>
                            <ListItemIcon>
                                <AccountCircle/>
                            </ListItemIcon>
                            <ListItemText
                                primary={<Box display="flex"
                                              alignItems="center">
                                    {pupil.name !== "default" ? pupil.name : "Standardschüler"}
                                    {context.isTeacher && ` (${pupil.instances.length} Karten)`}
                                    <Box
                                    flexGrow={1}/>
                                    {context.isTeacher && (pupil.password ?
                                            <>
                                                <Link href={accessLink(context, pupil)}
                                                      onClick={(event: MouseEvent) => {
                                                          event.preventDefault();
                                                          event.stopPropagation();
                                                          setAccessLinkPupil(pupil);
                                                      }}
                                                >
                                                    Zugangslink&nbsp;
                                                </Link>
                                                <Chip
                                                    onClick={() => context.history.push(`/pupil/${pupil.name}/${pupil.id}/password`)}
                                                    onMouseEnter={() => onPasswordChip = true}
                                                    onMouseLeave={() => onPasswordChip = false}
                                                    icon={<Lock/>} label={pupil.password}/>
                                            </>
                                            :
                                            <Chip
                                                onClick={() => context.history.push(`/pupil/${pupil.name}/${pupil.id}/password`)}
                                                onMouseEnter={() => onPasswordChip = true}
                                                onMouseLeave={() => onPasswordChip = false}
                                                icon={<LockOpen/>} label="kein Passwort"/>
                                    )}</Box>}
                            />
                        </ListItem>
                    ))}
                    {context.pupilsList.length === 0 && <ListItem key="no-pupils">

                        <ListItemText
                            primary={<Box style={{textAlign: "center"}}>Es sind keine Schüler angelegt.
                                {context.teacherId === DEFAULT_TEACHER_ID && `    
                                Als Schüler brauchst du einen Link von deinem Lehrer.
                                Als Lehrer erhälst du den Link vom Lernbox-Administrator.
                                `}
                            </Box>}
                        />
                    </ListItem>}
                    {context.isTeacher && props.create && !pupilGroup && context.pupilGroups.map(group => (
                        <ListItem button
                                  key={group.group_id}
                                  onClick={() => context.history.push("/pupils/create/" + group.group_id)}
                        >
                            <ListItemIcon>
                                <Group/>
                            </ListItemIcon>
                            <ListItemText
                                primary={"aus WebWeaver: " + group.group_name}
                            />
                        </ListItem>
                    ))}
                    {context.isTeacher && props.create && pupilGroup && pupilGroup.pupils.filter(pupil =>
                        !context.pupilsList.find(existingPupil => existingPupil.id === pupil.user_id),
                    ).map(pupil => (
                        <ListItem
                            key={pupil.user_id}
                        >
                            <ListItemIcon>
                                <PersonAdd/>
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Grid container>
                                        <Grid item xs={8} style={{alignSelf: "center"}}>
                                            {pupil.user_name}
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Button
                                                variant="contained"
                                                fullWidth
                                                onClick={() => createPupil(pupil.user_name, newPassword, pupil.user_id)}
                                            >
                                                Anlegen
                                            </Button>
                                        </Grid>
                                    </Grid>}
                            />
                        </ListItem>
                    ))}
                    {context.isTeacher && props.create &&
                    <ListItem key="new">
                        <ListItemIcon>
                            <PersonAdd/>
                        </ListItemIcon>
                        <ListItemText
                            primary={<Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <TextField label={"neuer Name"}
                                               value={newName}
                                               onChange={event => setNewName(event.target.value)}
                                               onKeyPress={onEnterPressed(() => createPupil(newName, newPassword))}
                                               fullWidth/>
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField label={"Passwort"}
                                               value={newPassword}
                                               onChange={event => setNewPassword(event.target.value)}
                                               onKeyPress={onEnterPressed(() => createPupil(newName, newPassword))}
                                               fullWidth
                                               InputProps={{
                                                   endAdornment: (
                                                       <Tooltip title="Neues Passwort generieren">
                                                           <Refresh
                                                               onClick={() => setNewPassword(randomPupilPassword())}
                                                               style={{cursor: "pointer"}}
                                                           />
                                                       </Tooltip>
                                                   ),
                                               }}
                                    />
                                </Grid>
                                <Grid item xs={4} style={{display: "flex", flexDirection: "column"}}>
                                    <Box flexGrow={1}/>
                                    <Button
                                        disabled={!newName}
                                        variant="contained"
                                        fullWidth
                                        onClick={() => createPupil(newName, newPassword)}
                                    >
                                        Anlegen
                                    </Button>
                                </Grid>
                            </Grid>}/>
                    </ListItem>}
                </List>
                <div>
                </div>
            </Main>
            <BottomGridContainer>
                {!props.create && !context.isTeacher &&
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => context.history.push("/teacher")}
                    >
                        Lehrermodus
                    </Button>
                </Grid>
                }
                {!props.create && context.isTeacher &&
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => context.history.push("/pupils/create")}
                    >
                        Neu anlegen
                    </Button>
                </Grid>
                }
                {props.create && context.isTeacher &&
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => context.history.push("/")}
                    >
                        Fertig
                    </Button>
                </Grid>
                }
            </BottomGridContainer>
        </>
    );
}
