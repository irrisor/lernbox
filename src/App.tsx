import * as React from "react";
import "./styles.css";
import {Context, reactContext} from "./Context";
import {Bar} from "./Bar";
import {Route, Switch, useHistory, useParams, useRouteMatch} from "react-router-dom";
import {Question} from "./Question";
import {PupilList} from "./PupilList";
import {Overview} from "./Overview";
import {Box} from "@material-ui/core";
import {Right} from "./Right";
import {Wrong} from "./Wrong";
import {PupilDelete} from "./PupilDelete";
import {Late} from "./Late";
import {Login} from "./Login";
import {EditCard} from "./EditCard";
import {Yay} from "./Yay";

function PupilRoute() {
    const context = React.useContext(reactContext);
    const {path} = useRouteMatch();
    const {pupilIndex} = useParams();
    React.useEffect(() => {
            context.pupilIndex = Number(pupilIndex);
        }, [pupilIndex, context.pupilIndex],
    );
    return (
        <Switch>
            <Route path={`${path}/right`}>
                <Right/>
            </Route>
            <Route path={`${path}/wrong`}>
                <Wrong/>
            </Route>
            <Route path={`${path}/late`}>
                <Late/>
            </Route>
            <Route path={`${path}/question`}>
                <Question/>
            </Route>
            <Route path={`${path}/delete`}>
                <PupilDelete/>
            </Route>
            <Route path={`${path}/`}>
                <Overview/>
            </Route>
        </Switch>
    );
}

const ScreenBox = ({fullScreen, children}: { fullScreen?: boolean, children: React.ReactNode }) => <Box
    height="100%"
    bgcolor="background.default"
>
    <Box
        display="flex"
        height="100%"
        bgcolor="background.default"
        maxHeight={fullScreen ? undefined : 750}
        paddingBottom={1}
    >
        <Bar>
            <Box
                display="flex"
                flexGrow={1}
                flexDirection="column"
                maxWidth={fullScreen ? undefined : "600px"}
                minWidth="350px"
                width={fullScreen ? "100%" : "80%"}
                mx="auto"
            >
                {children}
            </Box>
        </Bar>
    </Box>
</Box>;

export default function App() {
    const ContextProvider = reactContext.Provider;
    const history = useHistory();
    const [context, setContext] = React.useState(() => {
        const newContext = new Context(history);
        const storedPupils = localStorage.getItem("pupils");
        if (storedPupils) {
            try {
                newContext.pupils = JSON.parse(storedPupils);
            } catch (e) {
                console.error("Error reading local storage", e);
            }
        }
        return newContext;
    });
    context.setContext = setContext;
    return (
        <ContextProvider value={context}>
            <Switch>
                <Route path="/pupil/:pupilIndex">
                    <ScreenBox>
                        <PupilRoute/>
                    </ScreenBox>
                </Route>
                <Route path="/yay">
                    <ScreenBox fullScreen>
                        <Yay/>
                    </ScreenBox>
                </Route>
                <Route path="/login">
                    <ScreenBox>
                        <Login/>
                    </ScreenBox>
                </Route>
                <Route path="/edit">
                    <ScreenBox>
                        <EditCard/>
                    </ScreenBox>
                </Route>
                <Route path="/">
                    <ScreenBox>
                        <PupilList/>
                    </ScreenBox>
                </Route>
            </Switch>
        </ContextProvider>
    );
}
