import * as React from "react";
import {reactContext} from "../data/Context";
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
import ListIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import LogoffIcon from "@material-ui/icons/ExitToApp";
import CssBaseline from '@material-ui/core/CssBaseline';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import version from "../version.json";
import {Help, Info} from "@material-ui/icons";

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
        appBarOnTop: {
            zIndex: 2000,
        },
        // necessary for content to be below app bar
        toolbar: theme.mixins.toolbar,
        drawerPaper: {
            width: drawerWidth,
            zIndex: 800,
        },
        content: {
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            // height: "100%"
        },
    }),
);

function toggleFullScreen() {
    const anyDocument = document as any;
    if (
        document.fullscreenElement || anyDocument.webkitFullscreenElement
    ) {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(
                () => console.warn("Exiting fullscreen failed."));
        }
        if (anyDocument.webkitCancelFullScreen) {
            anyDocument.webkitCancelFullScreen();
        }
    } else {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(
                () => console.warn("Switching to fullscreen failed."));
        }
        const docElement: any = document.documentElement;
        if (docElement.webkitRequestFullscreen) {
            docElement.webkitRequestFullscreen((Element as any).ALLOW_KEYBOARD_INPUT);
        }
    }
}


const Menu = (props: { onClick: () => true }) => {
    const classes = useStyles();
    const context = React.useContext(reactContext);
    return (
        <div>
            <div className={classes.toolbar}/>
            <Divider/>
            <List>
                <ListItem button onClick={() => props.onClick() && toggleFullScreen()}>
                    <ListItemIcon><FullscreenIcon/></ListItemIcon>
                    <ListItemText primary="Vollbild"/>
                </ListItem>
                <ListItem button onClick={() => props.onClick() && context.history.push("/")}>
                    <ListItemIcon><AccountCircle/></ListItemIcon>
                    <ListItemText primary="Schülerliste"/>
                </ListItem>
                {!context.isTeacher && <ListItem button onClick={() => props.onClick() && context.back()}>
                    <ListItemIcon><Logo/></ListItemIcon>
                    <ListItemText primary="Lernen"/>
                </ListItem>}
                {context.isTeacher && <ListItem button
                                                disabled={context.currentPupilId === undefined}
                                                onClick={() => props.onClick() && context.history.push(`/pupil/${context.pupil?.name || "-"}/${context.currentPupilId}/delete`)}>
                    <ListItemIcon><DeleteIcon/></ListItemIcon>
                    <ListItemText primary="Schüler löschen"/>
                </ListItem>}
                <ListItem button
                          onClick={() => props.onClick() && context.history.push(`/teacher/list`)}>
                    <ListItemIcon><ListIcon/></ListItemIcon>
                    <ListItemText primary="Karten bearbeiten"/>
                </ListItem>
                {/*<ListItem button
                          onClick={() => props.onClick() && context.history.push(`/teacher/sync`)}>
                    <ListItemIcon><SyncIcon/></ListItemIcon>
                    <ListItemText primary="Synchronisieren"/>
                </ListItem>*/}
                <ListItem button
                          onClick={() => {
                              context.history.push("/help");
                          }}
                >
                    <ListItemIcon><Help/></ListItemIcon>
                    <ListItemText primary="Anleitung"/>
                </ListItem>
                <ListItem button
                          onClick={() => {
                              context.history.push("/about");
                          }}
                >
                    <ListItemIcon><Info/></ListItemIcon>
                    <ListItemText primary="Über Lernbox"/>
                </ListItem>
                <ListItem button
                          disabled={context.currentPupilId === undefined && !context.isTeacher}
                          onClick={() => props.onClick() && context.update(newContext => {
                              newContext.currentPasswordHash = "";
                              newContext.currentPupilId = undefined;
                              newContext.history.push("/");
                          })}
                >
                    <ListItemIcon><LogoffIcon/></ListItemIcon>
                    <ListItemText primary="Abmelden"/>
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
    const [menuOpen, setMenuOpen] = React.useState(context.menuOpen);

    const handleDrawerToggle = (): true => {
        context.menuOpen = !menuOpen;
        setMenuOpen(!menuOpen);
        return true;
    };
    return (
        <>
            <CssBaseline/>
            <AppBar position="fixed" className={menuOpen && !isWideScreen ? classes.appBarOnTop : undefined}>
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
                        {/*<Logo
                            style={{marginBottom: "-4px"}}/>*/} Lernbox{context.pupil && context.pupil.name !== "default" && ` von ${context.pupil.name}`}
                    </Typography>
                    <Typography variant="subtitle1" style={{fontSize: "0.5rem"}}>
                        version {version.version}
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
