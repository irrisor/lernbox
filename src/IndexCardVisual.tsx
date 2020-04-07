import * as React from "react";
import {makeStyles} from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import {Box, Grid} from "@material-ui/core";
import {SnapSVG} from "./SnapSVG";
import Snap from "snapsvg-cjs";

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
    pos: {
        marginBottom: 12,
    },
});

export function IndexCardVisual({category, text, description, image}: { category?: string, text: string, description?: string, image?: string }) {
    const classes = useStyles();
    const svg = React.useMemo(() => (s: Snap.Paper) => image !== undefined ? Snap.load(image
        , data => {
            const group = s.g();
            const dataElement = data as Snap.Element;
            group.append(dataElement);
            const loadedSVG = group.select("svg");
            const width = loadedSVG.attr("width");
            const height = loadedSVG.attr("height");
            loadedSVG.attr({width: undefined, height: undefined});
            if (!loadedSVG.attr("viewBox") && width && height) {
                loadedSVG.node.setAttribute("viewBox",
                    `${0} ${0} ${width} ${height}`);
            }
        }) : undefined, [image]);
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
                                {svg && text &&
                                <Grid item xs={2}>
                                    <SnapSVG width="100%" height="100%">
                                        {svg}
                                    </SnapSVG>
                                    <div style={{height: "100%", verticalAlign: "middle", display: "inline-block"}}/>
                                </Grid>}
                                {text ? <Grid item xs={text && svg ? 8 : 12}>
                                        <Typography variant="h5" component="h2" style={{display: "inline-block"}}>
                                            {text}
                                        </Typography>
                                    </Grid> :
                                    svg && <Grid item xs={12}>
                                        <SnapSVG width="80%" height="100%">
                                            {svg}
                                        </SnapSVG>
                                    </Grid>}
                                {text && svg && <Grid item xs={2}/>}
                            </Grid>
                        </Box>
                        <Typography className={classes.pos} color="textSecondary"/>
                        <Typography variant="body2" component="p">
                            {description}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
            <Card/>
        </>
    );
}
