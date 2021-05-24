import {Context, DEFAULT_PUPIL_ID, reactContext} from "../data/Context";
import {Route, Switch, useHistory} from "react-router";
import * as React from "react";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ScreenBox} from "../layout/Screenbox";
import {PupilRoute} from "./PupilRoute";
import {TeacherRoute} from "./TeacherRoute";
import {Yay} from "../views/Yay";
import {PupilList} from "../views/PupilList";
import {LoginView} from "../views/LoginView";
import {createMuiTheme, MuiThemeProvider} from '@material-ui/core/styles';
import {AboutView} from "../views/AboutView";
import {HelpView} from "../views/HelpView";
import {SynchronizationView} from "../views/SynchronizationView";

const theme = createMuiTheme({
    typography: {
        fontFamily: "roboto, arial, sans-serif",
    },
});

export default function App() {
    const ContextProvider = reactContext.Provider;
    const history = useHistory();
    const [context, setContext] = React.useState(() => new Context(history));
    React.useEffect(() => {
        (async () => {
            if (!context.touched) {
                context.touched = true;
                context.setContext = setContext;
                const newContext = new Context(history, context);
                setContext(newContext);
                if (history.location.pathname === "/test" &&
                    context.currentPupilId === undefined &&
                    context.pupilsList.length === 0) {
                    context.history.push(`/pupil/default/${DEFAULT_PUPIL_ID}`)
                }
            }
        })();
    });
    if (!context.initialized) return <span style={{display: "none"}}>context not initialized</span>;
    return (
        <ErrorBoundary>
            <MuiThemeProvider theme={theme}>
                <ContextProvider value={context}>
                    <Switch>
                        <Route path={[
                            `/login/:schoolId/none/:key`,
                            `/login/:schoolId/:teacherId/:readKey/:pupilId/:key`,
                            `/login/:schoolId/:teacherId/:key`,
                            `/login/:schoolId/:teacherId`,
                            `/login/:schoolId/`,
                            `/login`,
                        ]}>
                            <ScreenBox>
                                <LoginView/>
                            </ScreenBox>
                        </Route>
                        <Route path="/pupil/:pupilName/:pupilId">
                            <ScreenBox>
                                <PupilRoute/>
                            </ScreenBox>
                        </Route>
                        <Route path="/teacher">
                            <TeacherRoute/>
                        </Route>
                        <Route path={`/sync`}>
                            <ScreenBox fullScreen>
                                <SynchronizationView/>
                            </ScreenBox>
                        </Route>
                        <Route path="/yay">
                            <ScreenBox fullScreen>
                                <Yay/>
                            </ScreenBox>
                        </Route>
                        <Route path={[
                            "/pupils/create/:pupilGroupName",
                            "/pupils/create",
                        ]}>
                            <ScreenBox>
                                <PupilList create/>
                            </ScreenBox>
                        </Route>
                        <Route path="/about">
                            <ScreenBox fullScreen>
                                <AboutView/>
                            </ScreenBox>
                        </Route>
                        <Route path={[
                            "/help/:mode",
                            "/help",
                        ]}>
                            <ScreenBox fullScreen>
                                <HelpView/>
                            </ScreenBox>
                        </Route>
                        <Route path="/">
                            <ScreenBox>
                                <PupilList/>
                            </ScreenBox>
                        </Route>
                    </Switch>
                </ContextProvider>
            </MuiThemeProvider>
        </ErrorBoundary>
    );
}