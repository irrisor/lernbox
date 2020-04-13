import {SnapSVG} from "./SnapSVG";
import Snap, {sin} from "snapsvg-cjs";
import {positiveSVGs, randomPositiveSVG} from "./svgs";
import * as React from "react";

export function Yay() {
    return (
        /*<div className="everywhere">*/
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
                                group.transform(`s0,${w / 2},${h / 2}`).animate({transform: `s0.8,${w / 2},${h / 2}`}, 100, undefined, () => group.selectAll("path, circle, elipse").forEach(element => {
                                    element.animate({transform: `s1.1`}, 700, a => sin(a * 500 * Math.PI), () => element.animate({transform: `s1`}, 400, mina.bounce))
                                }));
                            });
                        });
                    }}
                </SnapSVG>
        // </div>
    );
}