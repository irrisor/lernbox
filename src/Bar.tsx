import * as React from "react";
import {reactContext} from "./Context";
import {createStyles, makeStyles, Theme, useTheme} from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import FullscreenIcon from "@material-ui/icons/Fullscreen";
import MenuIcon from "@material-ui/icons/Menu";
import Logo from "@material-ui/icons/School";
import {Badge, useMediaQuery} from "@material-ui/core";
import AccountCircle from "@material-ui/icons/AccountCircle";
import DeleteIcon from "@material-ui/icons/Delete";
import SyncIcon from "@material-ui/icons/Sync";
import LogoffIcon from "@material-ui/icons/ExitToApp";
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

const drawerWidth = 220;

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        menuButton: {
            marginRight: theme.spacing(2),
        },
        title: {
            flexGrow: 1,
        },
        drawer: {
            width: 0,
            transition: "width 0.2s ease-out",
        },
        drawerOpen: {
            [theme.breakpoints.up('sm')]: {
                width: drawerWidth,
                flexShrink: 0,
            },
            transition: "width 0.2s ease-out",
        },
        appBar: {
            zIndex: 5000,
        },
        // necessary for content to be below app bar
        toolbar: theme.mixins.toolbar,
        drawerPaper: {
            width: drawerWidth,
        },
        content: {
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
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


const Menu = (props: {onClick: () => true}) => {
    const classes = useStyles();
    const context = React.useContext(reactContext);
    return (
        <div>
            <div className={classes.toolbar}/>
            <Divider/>
            <List>
                <ListItem button onClick={() => props.onClick() && context.back()}>
                    <ListItemIcon><AccountCircle/></ListItemIcon>
                    <ListItemText primary="Übersicht"/>
                </ListItem>
                <ListItem button onClick={() => props.onClick() && toggleFullScreen()}>
                    <ListItemIcon><FullscreenIcon/></ListItemIcon>
                    <ListItemText primary="Vollbild"/>
                </ListItem>
                <ListItem button
                          onClick={() => props.onClick() && context.history.push(`/login`)}>
                    <ListItemIcon><SyncIcon/></ListItemIcon>
                    <ListItemText primary="Synchronisieren"/>
                </ListItem>
                <ListItem button
                          disabled={context.pupilIndex === undefined}
                          onClick={() => props.onClick() && context.history.push(`/pupil/${context.pupilIndex}/delete`)}>
                    <ListItemIcon><DeleteIcon/></ListItemIcon>
                    <ListItemText primary="Löschen"/>
                </ListItem>
                <ListItem button
                          disabled={context.pupilIndex === undefined}
                          onClick={() => () => props.onClick() && context.history.push("/")}>
                    <ListItemIcon><LogoffIcon/></ListItemIcon>
                    <ListItemText primary="Schüler wechseln"/>
                </ListItem>
            </List>
        </div>
    );
};

export function Bar(props: { children: React.ReactNode }) {
    const context = React.useContext(reactContext);
    const classes = useStyles();
    const theme = useTheme();
    const isWideScreen = useMediaQuery(theme.breakpoints.up('sm'));
    const [menuOpen, setMenuOpen] = React.useState(localStorage.getItem("menuOpen") === "true");

    const handleDrawerToggle = (): true => {
        localStorage.setItem("menuOpen", "" + !menuOpen);
        setMenuOpen(!menuOpen);
        return true;
    };
    return (
        <>
            <CssBaseline/>
            <AppBar position="fixed" className={classes.appBar}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        className={classes.menuButton}
                    >
                        <MenuIcon/>
                    </IconButton>
                    <Typography variant="h6" className={classes.title}>
                        <Logo style={{marginBottom: "-4px"}}/> Lernbox{context.pupil && ` von ${context.pupil.name}`}
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
            <nav className={menuOpen ? classes.drawerOpen : classes.drawer} aria-label="mailbox folders">
                {!isWideScreen &&
                <Drawer
                    variant="temporary"
                    anchor={theme.direction === 'rtl' ? 'right' : 'left'}
                    open={menuOpen}
                    onClose={handleDrawerToggle}
                    classes={{
                        paper: classes.drawerPaper,
                    }}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                >
                    <Menu onClick={handleDrawerToggle}/>
                </Drawer>
                }
                {isWideScreen && menuOpen &&
                <Drawer
                    classes={{
                        paper: classes.drawerPaper,
                    }}
                    variant="permanent"
                    open
                >
                    <Menu onClick={(): true => true}/>
                </Drawer>
                }
            </nav>

            <main className={classes.content}>
                <div className={classes.toolbar}/>
                {props.children}
            </main>
        </>
    );
}
