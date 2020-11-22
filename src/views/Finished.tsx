import * as React from "react";
import {Button, Grid} from "@material-ui/core";
import {positiveSVGs, randomPositiveSVG} from "../img/svgs";
import {Main} from "../layout/Main";
import {BottomGridContainer} from "../layout/BottomGridContainer";
import {reactContext} from "../data/Context";
import {SnapSVG} from "../components/SnapSVG";
import Snap, {sin} from "snapsvg-cjs";
import { useHistory } from "react-router-dom";

export function Finished() {
    const context = React.useContext(reactContext);
    const day = new Date().getDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const svg = React.useMemo(() => randomPositiveSVG(), [day]);
    const history = useHistory();
    return (<>
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

                    Snap.load(svg, data => {
                        const w = svgElement.clientWidth;
                        const h = svgElement.clientHeight;
                        const group = s.g();
                        group.append(data as Snap.Element);
                        group.select("svg").attr({"overflow": "visible"});
                        // let group = s.g(s.selectAll("*"));
                        group.transform(`s0,${w / 2},${h / 2}`).animate({transform: `s0.8,${w / 2},${h / 2}`}, 100, undefined, () => group.selectAll("path, circle, elipse").forEach(element => {
                            element.animate({transform: `s1.1`}, 700, a => sin(a * 500 * Math.PI), () => element.animate({transform: `s1`}, 400, mina.bounce))
                        }));
                    });
                });
            }}
        </SnapSVG>
        <Main>
            <Grid container spacing={2} justify="center" alignContent="center" onClick={() => context.next()}>
                <Grid item xs={12}>
                    Super! Für heute bist du fertig.
                </Grid>
            </Grid>
        </Main>
        <BottomGridContainer>
            <Grid item xs={12}>
                <Button variant="contained" color="primary" onClick={() => history.replace("/")} fullWidth autoFocus>
                    Fertig
                </Button>
            </Grid>
        </BottomGridContainer>
    </>);
}
