import * as React from "react";
import "./styles.css";
import {Context, reactContext} from "./Context";
import {Bar} from "./Bar";
import {Route, Switch, useHistory, useParams, useRouteMatch} from "react-router-dom";
import {Question} from "./Question";
import {PupilList} from "./PupilList";
import {Overview} from "./Overview";
import {Box} from "@material-ui/core";
import {positiveSVGs, randomPositiveSVG} from "./svgs";
import {SnapSVG} from "./SnapSVG";
import Snap, {sin} from "snapsvg-cjs";
import {Right} from "./Right";
import {Wrong} from "./Wrong";
import {PupilDelete} from "./PupilDelete";
import {Late} from "./Late";

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
            <Box
                height="100%"
                bgcolor="background.default"
            >
                <Box
                    display="flex"
                    height="100%"
                    bgcolor="background.default"
                    maxHeight={750}
                    paddingBottom={1}
                >
                    <Bar>
                        <Box
                            display="flex"
                            flexGrow={1}
                            flexDirection="column"
                            maxWidth="600px"
                            minWidth="350px"
                            width="80%"
                            mx="auto"
                        >
                            <Switch>
                                <Route path="/pupil/:pupilIndex">
                                    <PupilRoute/>
                                </Route>
                                <Route path="/svg">
                                    <div className="everywhere">
                                        <SnapSVG width="100%" height="100%">
                                            {(s, svgElement) => {
                                                Snap.load(positiveSVGs[0], data => {
                                                    const w = svgElement.clientWidth;
                                                    const h = svgElement.clientHeight;
                                                    const group = s.g();
                                                    group.append(data as Snap.Element);
                                                    group.select("svg").attr({"overflow": "visible"});
                                                    // let group = s.g(s.selectAll("*"));
                                                    group.transform(`s0,${w / 2},${h / 2}`).animate(
                                                        {transform: `s2,${w / 2},${h / 2}`, opacity: 0}, 300,
                                                        undefined, () => group.remove());

                                                    Snap.load(randomPositiveSVG(), data => {
                                                        const w = svgElement.clientWidth;
                                                        const h = svgElement.clientHeight;
                                                        const group = s.g();
                                                        group.append(data as Snap.Element);
                                                        group.select("svg").attr({"overflow": "visible"});
                                                        // let group = s.g(s.selectAll("*"));
                                                        group.transform(`s0,${w / 2},${h / 2}`).animate({transform: `s0.8,${w / 2},${h / 2}`}, 100, undefined, () => group.selectAll("path, circle").forEach(element => {
                                                            element.animate({transform: `s1.1`}, 700, a => sin(a * 500 * Math.PI), () => element.animate({transform: `s1`}, 400, mina.bounce))
                                                        }));
                                                    });
                                                });
                                            }}
                                        </SnapSVG>
                                    </div>
                                </Route>
                                <Route path="/">
                                    <PupilList/>
                                </Route>
                            </Switch>
                        </Box>
                    </Bar>
                </Box>
            </Box>
        </ContextProvider>
    );
}
