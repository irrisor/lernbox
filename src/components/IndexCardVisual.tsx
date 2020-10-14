import * as React from "react";
import {makeStyles} from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import {Box, Grid} from "@material-ui/core";
import {SnapSVG} from "./SnapSVG";
import Snap from "snapsvg-cjs";
import {Image} from "../data/cards";

const useStyles = makeStyles({
    root: {
        minWidth: 350,
        maxWidth: 450,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "center",
        cursor: "pointer",
    },
    content: {
        minHeight: 280,
        display: "flex",
    },
    title: {
        fontSize: 14,
        textAlign: "right",
    },
    imageDescription: {
        fontSize: 10,
        textAlign: "center",
        textDecoration: "none",
    },
    pos: {
        marginBottom: 12,
    },
    centerVertically: {
        justifyContent: "center",
        display: "flex",
        flexDirection: "column",
    },
});

function convertUnit(width: string): number | undefined {
    if (width) {
        const unit = width.substring(width.length - 2);
        if (unit === "pt") {
            return Number(width.substring(0, width.length - 2)) * 1.33;
        } else if (unit === "px") {
            return Number(width.substring(0, width.length - 2));
        }
        return Number(width);
    } else {
        return undefined;
    }
}

export function IndexCardVisual(props:
                                    {
                                        category?: string,
                                        text?: string,
                                        description?: string,
                                        image?: Image | React.ReactElement,
                                        onClick?: () => void
                                    }) {
    const {category, text, description, onClick} = props;
    const {parameters, url, infoURL} = props.image && !("type" in props.image) ? props.image : {
        parameters: undefined,
        url: undefined,
        infoURL: undefined,
    };
    const [forceSnapSVG, setForceSnapSVG] = React.useState(false);
    const classes = useStyles();
    const svg = React.useMemo(() => {
        return (s: Snap.Paper, svgElement: SVGElement) => {
            if (url) {
                if (url.match(/.*\.svg$/)) {
                    Snap.load(url
                        , data => {
                            const dataElement = data as Snap.Element;
                            if (dataElement?.node?.nodeName === "svg") {
                                const group = s.g();
                                group.append(dataElement);
                                const loadedSVG = group.select("svg");
                                if (loadedSVG !== null) {
                                    const width = convertUnit(loadedSVG.attr("width"));
                                    const height = convertUnit(loadedSVG.attr("height"));
                                    loadedSVG.node.removeAttribute("width");
                                    loadedSVG.node.removeAttribute("height");
                                    if (!loadedSVG.attr("viewBox") && width && height) {
                                        loadedSVG.node.setAttribute("viewBox",
                                            `${0} ${0} ${width} ${height}`);
                                    }
                                    if (parameters) {
                                        for (const selector of Object.keys(parameters)) {
                                            const value = parameters[selector];
                                            try {
                                                if (typeof value === "string") {
                                                    const elements = loadedSVG.selectAll(selector + " tspan");
                                                    if (elements) {
                                                        elements.forEach(element => {
                                                            element.node.textContent = value;
                                                        });
                                                    } else {
                                                        const texts = loadedSVG.selectAll(selector);
                                                        if (texts) {
                                                            texts.attr({text: value});
                                                        }
                                                    }
                                                } else {
                                                    const element = selector === "svg" ? loadedSVG : loadedSVG.selectAll(selector);
                                                    if (element) {
                                                        element.attr(value);
                                                    }
                                                }
                                            } catch (e) {
                                                console.error("Error aplying imageParameter", selector, parameters, e);
                                            }
                                        }
                                    }
                                }
                            } else {
                                console.error("Loading " + url + " did not retrieve an svg, but ", data);
                                s.text(0, 20, "Fehler beim Laden von " + url).attr({style: "fill: red;"});
                            }
                        });
                } else if (url.match(/.*\.(jpg|png)$/)) {
                    const image = s.image(url, 0, 0, undefined as unknown as number, undefined as unknown as number);
                    image.node.onload = () => {
                        const bBox = image.getBBox();
                        svgElement.setAttribute("viewBox", `0 0 ${bBox.width} ${bBox.height}`)
                    };
                    image.node.onerror = error => {
                        console.error("Loading " + url + " failed!", error);
                        s.text(0, 20, "Fehler beim Laden von " + url).attr({style: "fill: red;"});
                    }
                } else {
                    s.text(0, 20, "Unbekannte Bildart: " + url).attr({style: "fill: red;"});
                }
            }
        };
    }, [url, parameters]);
    const imageInfoLink = infoURL ?
        <a href={infoURL}
           className={classes.imageDescription}
           target="_blank"
           rel="noopener noreferrer"
        >
            <Typography
                className={classes.imageDescription}
                variant="body2"
                color="primary"
            >Bildquelle</Typography></a> : null;
    const [hovered, setHovered] = React.useState(false);
    const imageComponent = props.image && ("type" in props.image ? props.image : url && (
        forceSnapSVG || parameters ?
            <SnapSVG width={text ? "100%" : "80%"} height="100%">
                {svg}
            </SnapSVG> :
            <img src={url}
                 style={text ? {maxHeight: 175, width: "100%"} : {height: 175, maxWidth: "80%"}}
                 alt="Bild nicht geladen"
                 onError={() => setForceSnapSVG(true)}
            />

    ));
    return (
        <>
            <Card className={classes.root}
                  onClick={onClick}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                  elevation={onClick && hovered ? 4 : 1}>
                <CardContent className={classes.content}>
                    <Box display="flex" flexDirection="column" flexGrow="1">
                        <Typography
                            className={classes.title}
                            color="textSecondary"
                            gutterBottom
                        >
                            {category}
                        </Typography>
                        <Box
                            display="flex"
                            justifyContent="center"
                            flexDirection="column"
                            flexGrow={1}
                        >
                            <Grid container spacing={1}>
                                {imageComponent && text &&
                                <Grid item xs={2}>{imageComponent}</Grid>}
                                {text ? <Grid item xs={text && imageComponent ? 8 : 12}
                                              style={{
                                                  justifyContent: "center",
                                                  display: "flex",
                                                  flexDirection: "column",
                                              }}>
                                        <Typography variant="h5" component="h2">
                                            {text}
                                        </Typography>
                                    </Grid> :
                                    imageComponent && <Grid item xs={12}>{imageComponent}</Grid>}
                                {text && imageComponent && <Grid item xs={2}/>}
                            </Grid>
                        </Box>
                        <Typography className={classes.pos} color="textSecondary"/>
                        <Grid container>
                            {imageInfoLink && (text || description) &&
                            <Grid item xs={2} className={classes.centerVertically}>
                                {imageInfoLink}
                            </Grid>}
                            {(text || description) ? <Grid item xs={imageInfoLink ? 8 : 12}
                                                           className={classes.centerVertically}>
                                    <Typography variant="body2" component="p">
                                        {description}
                                    </Typography>
                                </Grid> :
                                imageInfoLink && <Grid item xs={12}>
                                    {imageInfoLink}
                                </Grid>}
                            {imageInfoLink && (text || description) && <Grid item xs={2}/>}
                        </Grid>


                    </Box>
                </CardContent>
            </Card>
            <Card/>
        </>
    );
}
