import * as React from "react";
import {reactContext} from "./Context";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import FullscreenIcon from "@material-ui/icons/Fullscreen";
import MenuIcon from "@material-ui/icons/Menu";
import {Badge} from "@material-ui/core";
import AccountCircle from "@material-ui/icons/AccountCircle";
import {useHistory} from "react-router-dom";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            flexGrow: 1,
        },
        menuButton: {
            marginRight: theme.spacing(2),
        },
        title: {
            flexGrow: 1,
        },
    }),
);

function toggleFullScreen() {
    const documentAny = document as any;
    if (
        !documentAny.fullscreenElement && // alternative standard method
        !documentAny.mozFullScreenElement &&
        !documentAny.webkitFullscreenElement &&
        !documentAny.msFullscreenElement
    ) {
        // current working methods
        if (documentAny.documentElement.requestFullscreen) {
            documentAny.documentElement.requestFullscreen();
        } else if (documentAny.documentElement.msRequestFullscreen) {
            documentAny.documentElement.msRequestFullscreen();
        } else if (documentAny.documentElement.mozRequestFullScreen) {
            documentAny.documentElement.mozRequestFullScreen();
        } else if (documentAny.documentElement.webkitRequestFullscreen) {
            documentAny.documentElement.webkitRequestFullscreen(
                (Element as any).ALLOW_KEYBOARD_INPUT,
            );
        }
    } else {
        if (documentAny.exitFullscreen) {
            documentAny.exitFullscreen();
        } else if (documentAny.msExitFullscreen) {
            documentAny.msExitFullscreen();
        } else if (documentAny.mozCancelFullScreen) {
            documentAny.mozCancelFullScreen();
        } else if (documentAny.webkitExitFullscreen) {
            documentAny.webkitExitFullscreen();
        }
    }
}

export function Bar() {
    const context = React.useContext(reactContext);
    const history = useHistory();
    const classes = useStyles();
    return (
        <>
            <AppBar position="static">
                <Toolbar>
                  <IconButton
                      edge="start"
                      className={classes.menuButton}
                      color="inherit"
                      aria-label="menu"
                      onClick={toggleFullScreen}
                  >
                    <MenuIcon />
                  </IconButton>
                    <Typography variant="h6" className={classes.title}>
                        Lernbox{context.pupil && ` von ${context.pupil.name}`}
                    </Typography>
                    <IconButton
                        color="inherit"
                        aria-label="fullscreen"
                        onClick={toggleFullScreen}
                    >
                        <FullscreenIcon/>
                    </IconButton>
                    <IconButton
                        aria-label={`${context.cardsLeft} Karten`}
                        color="inherit"
                        onClick={() => {
                            context.back();
                        }}
                    >
                        <Badge badgeContent={context.cardsLeft} color="secondary">
                            <AccountCircle/>
                        </Badge>
                    </IconButton>
                </Toolbar>
            </AppBar>
        </>
    );
}
