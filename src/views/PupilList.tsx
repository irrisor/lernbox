import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import * as React from "react";
import {reactContext} from "../data/Context";
import AccountCircle from "@material-ui/icons/AccountCircle";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {Box, Button, Chip, Grid, TextField, Tooltip} from "@material-ui/core";
import {onEnterPressed} from "./Question";
import {Pupil} from "../data/Pupil";
import {Lock, LockOpen, Refresh} from "@material-ui/icons";
import {randomFrom} from "../img/svgs";
import {words} from "../data/words";

function randomPupilPassword() {
    return randomFrom(words).toLowerCase() + Math.floor(Math.random() * 90 + 10);
}

export function PupilList() {
    const context = React.useContext(reactContext);
    React.useEffect(() => context.currentPupilId = undefined, [context.currentPupilId]);
    const [newName, setNewName] = React.useState("");
    const [password, setPassword] = React.useState(randomPupilPassword());
    const createPupil = () => {
        if (newName !== "") {
            context.createPupil(newName, password);
            setNewName("");
            setPassword(randomPupilPassword());
        }
    };
    let onPasswordChip = false;
    return (
        <>
            <Main>
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
                                primary={<Box display="flex" alignItems="center">{pupil.name !== "default" ? pupil.name : "Standardschüler"}<Box flexGrow={1}/>
                                    {context.isTeacher && (pupil.password ?
                                            <Chip onClick={() => context.history.push(`/pupil/${pupil.name}/${pupil.id}/password`)}
                                                  onMouseEnter={() => onPasswordChip = true}
                                                  onMouseLeave={() => onPasswordChip = false}
                                                  icon={<Lock/>} label={pupil.password}/>
                                            :
                                            <Chip onClick={() => context.history.push(`/pupil/${pupil.name}/${pupil.id}/password`)}
                                                  onMouseEnter={() => onPasswordChip = true}
                                                  onMouseLeave={() => onPasswordChip = false}
                                                  icon={<LockOpen/>} label="kein Passwort"/>
                                    )}</Box>}
                            />
                        </ListItem>
                    ))}
                    {context.isTeacher &&
                    <ListItem button key="new">
                        <ListItemIcon>
                            <AccountCircle/>
                        </ListItemIcon>
                        <ListItemText
                            primary={<Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField label={"neuen Namen eingeben"}
                                               value={newName}
                                               onChange={event => setNewName(event.target.value)}
                                               onKeyPress={onEnterPressed(createPupil)}
                                               fullWidth/>
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField label={"Passwort"}
                                               value={password}
                                               onChange={event => setPassword(event.target.value)}
                                               onKeyPress={onEnterPressed(createPupil)}
                                               fullWidth
                                               InputProps={{
                                                   endAdornment: (
                                                       <Tooltip title="Neues Passwort generieren">
                                                           <Refresh
                                                               onClick={() => setPassword(randomPupilPassword())}
                                                               style={{cursor: "pointer"}}
                                                           />
                                                       </Tooltip>
                                                   ),
                                               }}
                                    />
                                </Grid>
                            </Grid>}/>
                    </ListItem>}
                </List>
                <div>
                </div>
            </Main>
            <BottomGridContainer>
                {!context.isTeacher &&
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
                {context.isTeacher &&
                <Grid item xs={12}>
                    <Button disabled={newName === ""}
                            variant="contained"
                            fullWidth
                            onClick={createPupil}
                    >
                        Neu anlegen
                    </Button>
                </Grid>
                }
            </BottomGridContainer>
        </>
    );
}
