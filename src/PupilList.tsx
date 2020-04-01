import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import * as React from "react";
import {reactContext} from "./Context";
import AccountCircle from "@material-ui/icons/AccountCircle";
import {Main} from "./layout/Main";
import {BottomGridContainer} from "./layout/BottomGridContainer";
import {Button, Grid, TextField} from "@material-ui/core";
import {onEnter} from "./Question";

export function PupilList() {
    const context = React.useContext(reactContext);
    React.useEffect(() => context.pupilIndex = undefined, [context.pupilIndex]);
    const [newName, setNewName] = React.useState("");
    const createPupil = () => {
        if (newName !== "") {
            context.createPupil(newName);
            setNewName("");
        }
    };
    return (
        <>
            <Main>
                <List component="nav" aria-label="main mailbox folders" style={{width: "100%"}}>
                    {context.pupils.map((pupil, index) => (
                        <ListItem button key={pupil.name}>
                            <ListItemIcon>
                                <AccountCircle/>
                            </ListItemIcon>
                            <ListItemText
                                primary={pupil.name}
                                onClick={() => {
                                    context.history.push(`/pupil/${index}/`);
                                }}
                            />
                        </ListItem>
                    ))}
                    <ListItem button key="new">
                        <ListItemIcon>
                            <AccountCircle/>
                        </ListItemIcon>
                        <TextField label={"neuen Namen eingeben"}
                                   value={newName}
                                   onChange={event => setNewName(event.target.value)}
                                   onKeyPress={onEnter(createPupil)}
                                   fullWidth/>
                    </ListItem>
                </List>
            </Main>
            <BottomGridContainer>
                <Grid item xs={12}>
                    <Button disabled={newName === ""}
                            variant="contained"
                            fullWidth
                            onClick={createPupil}
                    >
                        Neu anlegen
                    </Button>
                </Grid>
            </BottomGridContainer>
        </>
    );
}
