import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import * as React from "react";
import { reactContext } from "./Context";
import AccountCircle from "@material-ui/icons/AccountCircle";

export function PupilList() {
  const context = React.useContext(reactContext);
  return (
    <>
      <List component="nav" aria-label="main mailbox folders">
        {context.pupils.map(pupil => (
          <ListItem button key={pupil.name}>
            <ListItemIcon>
              <AccountCircle />
            </ListItemIcon>
            <ListItemText
              primary={pupil.name}
              onClick={() => (context.pupilName = pupil.name)}
            />
          </ListItem>
        ))}
      </List>
    </>
  );
}
