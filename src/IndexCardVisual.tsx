import * as React from "react";
import {makeStyles} from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import {Box, Grid} from "@material-ui/core";
import {SnapSVG} from "./SnapSVG";
import Snap from "snapsvg-cjs";
import {IndexCard} from "./cards";

const useStyles = makeStyles({
    root: {
        minWidth: 350,
        maxWidth: 450,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "center",
    },
    content: {
        minHeight: 200,
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

export function IndexCardVisual({category, text, description, image, imageParameters}:
                                    {
                                        category?: string,
                                        text?: string,
                                        description?: string,
                                        image?: string
                                        imageParameters?: IndexCard["imageParameters"]
                                    }) {
    const classes = useStyles();
    const [imageURL, setImageURL] = React.useState<string | undefined>();
    const [imageInfoURL, setImageInfoURL] = React.useState<string | undefined>();
    React.useEffect(() => {
        (async () => {
            const match = image && image.match(
                /(https:\/\/commons.wikimedia.org\/wiki\/File:([^/]*)|https:\/\/upload.wikimedia.org\/.*\/([^/]*)|[^/]*)/);
            const wikiMediaFileName = match ? match[2] || match[3] : undefined;
            if (wikiMediaFileName) {
                const apiURL = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${
                    wikiMediaFileName
                }&prop=imageinfo&iiprop=extmetadata%7Curl&format=json&origin=*`;
                const response = await fetch(apiURL, {mode: "cors"});
                const metadata = await response.json();
                const pages = metadata && metadata.query && Object.keys(metadata.query.pages);
                const page = Array.isArray(pages) && pages.length > 0 && metadata.query.pages[pages[0]];
                if (page && page.imageinfo && Array.isArray(page.imageinfo) && page.imageinfo.length > 0 && page.imageinfo[0]) {
                    const imageinfo = page.imageinfo[0];
                    setImageURL(imageinfo.url);
                    setImageInfoURL(imageinfo.descriptionurl);
                }
            } else if (image && image.match(/[./].*/)) {
                setImageURL(image);
                setImageInfoURL(undefined);
            }
        })()
    }, [image]);
    const svg = React.useMemo(() => (s: Snap.Paper, svgElement: SVGElement) => {
        if (imageURL) {
            if (imageURL.match(/.*\.svg/)) {
                Snap.load(imageURL
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
                            if (imageParameters) {
                                for (const selector of Object.keys(imageParameters)) {
                                    const value = imageParameters[selector];
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
                                        console.error("Error aplying imageParameter", selector, imageParameters, e);
                                    }
                                }
                            }
                        }
                    });
            } else if (imageURL.match(/.*\.(jpg|png)/)) {
                const image = s.image(imageURL, 0, 0, undefined as unknown as number, undefined as unknown as number);
                image.node.onload = () => {
                    const bBox = image.getBBox();
                    svgElement.setAttribute("viewBox", `0 0 ${bBox.width} ${bBox.height}`)
                };
            }
        }
    }, [imageURL, imageParameters]);
    const imageInfoLink = imageInfoURL ?
        <a href={imageInfoURL}
           className={classes.imageDescription}
           target="_blank"
           rel="noopener noreferrer"
        >
            <Typography
                className={classes.imageDescription}
                variant="body2"
                color="primary"
            >Bildquelle</Typography></a> : null;
    return (
        <>
            <Card className={classes.root}>
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
                                {image && text &&
                                <Grid item xs={2}>
                                    <SnapSVG width="100%" height="100%">
                                        {svg}
                                    </SnapSVG>
                                </Grid>}
                                {text ? <Grid item xs={text && image ? 8 : 12}
                                              style={{
                                                  justifyContent: "center",
                                                  display: "flex",
                                                  flexDirection: "column",
                                              }}>
                                        <Typography variant="h5" component="h2">
                                            {text}
                                        </Typography>
                                    </Grid> :
                                    image && <Grid item xs={12}>
                                        <SnapSVG width="80%" height="100%">
                                            {svg}
                                        </SnapSVG>
                                    </Grid>}
                                {text && image && <Grid item xs={2}/>}
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
