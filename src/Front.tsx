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

export function Front() {
  const context = React.useContext(reactContext);
  const classes = useStyles();
  if (!context.card) return <>Keine Karte aktiv</>;
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
              {context.card.groups.join(", ")}
            </Typography>
            <Box
              display="flex"
              justifyContent="center"
              flexDirection="column"
              flexGrow={1}
            >
              <Typography variant="h5" component="h2">
                {context.card.question}
              </Typography>
            </Box>
            <Typography className={classes.pos} color="textSecondary" />
            <Typography variant="body2" component="p">
              {context.card.description}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Card />
    </>
  );
}
