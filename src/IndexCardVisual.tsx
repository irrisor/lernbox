import * as React from "react";
import {makeStyles} from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import {Box, Grid} from "@material-ui/core";
import {SnapSVG} from "./SnapSVG";
import Snap from "snapsvg-cjs";
import {Image} from "./cards";
import LazyLoad from 'react-lazyload';

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
                                        image?: Image,
                                        onClick?: () => void
                                    }) {
    const {category, text, description, onClick} = props;
    const {parameters, url, infoURL} = props.image || {parameters: undefined, url: undefined, infoURL: undefined};
    const classes = useStyles();
    // FIXME https://commons.wikimedia.org/wiki/File:FoxBassoon.jpg
    // FIXME https://commons.wikimedia.org/wiki/File:Xylophone_(colourful).svg
    const svg = React.useMemo(() => {
        return (s: Snap.Paper, svgElement: SVGElement) => {
            if (url) {
                if (url.match(/.*\.svg/)) {
                    Snap.load(url
                        , data => {
                            const group = s.g();
                            const dataElement = data as Snap.Element;
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
                        });
                } else if (url.match(/.*\.(jpg|png)/)) {
                    const image = s.image(url, 0, 0, undefined as unknown as number, undefined as unknown as number);
                    image.node.onload = () => {
                        const bBox = image.getBBox();
                        svgElement.setAttribute("viewBox", `0 0 ${bBox.width} ${bBox.height}`)
                    };
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
                                {url && text &&
                                <Grid item xs={2}>
                                    <LazyLoad>
                                        <SnapSVG width="100%" height="100%">
                                            {svg}
                                        </SnapSVG>
                                    </LazyLoad>
                                </Grid>}
                                {text ? <Grid item xs={text && url ? 8 : 12}
                                              style={{
                                                  justifyContent: "center",
                                                  display: "flex",
                                                  flexDirection: "column",
                                              }}>
                                        <Typography variant="h5" component="h2">
                                            {text}
                                        </Typography>
                                    </Grid> :
                                    url && <Grid item xs={12}>
                                        <LazyLoad>
                                            <SnapSVG width="80%" height="100%">
                                                {svg}
                                            </SnapSVG>
                                        </LazyLoad>
                                    </Grid>}
                                {text && url && <Grid item xs={2}/>}
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
