import {Context, reactContext} from "../data/Context";
import {Route, Switch, useHistory} from "react-router";
import * as React from "react";
import {synchronize} from "../views/Login";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ScreenBox} from "../layout/Screenbox";
import {PupilRoute} from "./PupilRoute";
import {TeacherRoute} from "./TeacherRoute";
import {Yay} from "../views/Yay";
import {PupilList} from "../views/PupilList";

export default function App() {
    const ContextProvider = reactContext.Provider;
    const history = useHistory();
    const [context, setContext] = React.useState(() => new Context(history));
    React.useEffect(() => {
        (async () => {
            if (!context.touched) {
                context.touched = true;
                await synchronize(context, true).catch(e => console.error("Error synchronizing data", e));
                context.setContext = setContext;
                const newContext = new Context(history, context);
                setContext(newContext);
                await synchronize(newContext, false).catch(e => console.error("Error synchronizing data", e));
            }
        })();
    });
    if (!context.initialized) return <span style={{display: "none"}}>context not initialized</span>;
    return (
        <ErrorBoundary>
            <ContextProvider value={context}>
                <Switch>
                    <Route path="/pupil/:pupilName">
                        <ScreenBox>
                            <PupilRoute/>
                        </ScreenBox>
                    </Route>
                    <Route path="/teacher">
                        <TeacherRoute/>
                    </Route>
                    <Route path="/yay">
                        <ScreenBox fullScreen>
                            <Yay/>
                        </ScreenBox>
                    </Route>
                    <Route path="/">
                        <ScreenBox>
                            <PupilList/>
                        </ScreenBox>
                    </Route>
                </Switch>
            </ContextProvider>
        </ErrorBoundary>
    );
}