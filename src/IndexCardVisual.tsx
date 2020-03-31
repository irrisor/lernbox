import * as React from "react";
import { reactContext } from "./Context";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { Box } from "@material-ui/core";

const useStyles = makeStyles({
  root: {
    minWidth: 350,
    maxWidth: "80%",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center"
  },
  content: {
    minHeight: 200,
    display: "flex"
  },
  title: {
    fontSize: 14,
    textAlign: "right"
  },
  pos: {
    marginBottom: 12
  }
});

export function IndexCardVisual({category, main, description}: {category?: string, main: string, description?: string}) {
  const classes = useStyles();
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
              <Typography variant="h5" component="h2">
                {main}
              </Typography>
            </Box>
            <Typography className={classes.pos} color="textSecondary" />
            <Typography variant="body2" component="p">
              {description}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card />
    </>
  );
}
