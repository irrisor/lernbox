import {Context, reactContext} from "../data/Context";
import {Route, Switch, useHistory, useRouteMatch} from "react-router";
import * as React from "react";
import {ErrorBoundary} from "../util/ErrorBoundary";
import {ScreenBox} from "../layout/Screenbox";
import {PupilRoute} from "./PupilRoute";
import {TeacherRoute} from "./TeacherRoute";
import {Yay} from "../views/Yay";
import {PupilList} from "../views/PupilList";
import {synchronize} from "../sync/synchronize";

export default function App() {
    const ContextProvider = reactContext.Provider;
    const history = useHistory();
    const [context, setContext] = React.useState(() => new Context(history));
    const {path} = useRouteMatch();
    React.useEffect(() => {
        (async () => {
            if (!context.touched) {
                context.touched = true;
                synchronize(context, true);
                context.setContext = setContext;
                const newContext = new Context(history, context);
                setContext(newContext);
                if (path === "/" &&
                    context.currentPupilId === undefined &&
                    context.pupilsList.length === 1 &&
                    context.pupilsList[0].name === "default") {
                    context.history.push(`/pupil/default/${context.pupilsList[0].id}`)
                }
            }
        })();
    });
    if (!context.initialized) return <span style={{display: "none"}}>context not initialized</span>;
    return (
        <ErrorBoundary>
            <ContextProvider value={context}>
                <Switch>
                    <Route path="/pupil/:pupilName/:pupilId">
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