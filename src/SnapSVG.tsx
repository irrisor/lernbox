import * as React from "react";
import {SVGProps} from "react";
import Snap from "snapsvg-cjs";

export function SnapSVG({children, ...otherProps}: SVGProps<SVGElement> & {
    children: (snap: Snap.Paper, element: SVGElement) => void
}) {
    const [svg, setSVG] = React.useState();
    React.useEffect(() => {
        if (svg) {
            children(Snap(svg), svg)
        }
    }, [svg]);
    return (<svg
        {...otherProps}
        ref={setSVG}
    />);
}
