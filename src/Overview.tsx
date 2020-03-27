import * as React from "react";
import { reactContext } from "./Context";
import { useHistory } from "react-router-dom";
import { Button, Grid, Box } from "@material-ui/core";

export function Overview() {
  const context = React.useContext(reactContext);
  const history = useHistory();
  if (!context.pupil) return <>Kein Schüler ausgewählt</>;
  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        textAlign="center"
        flexGrow={1}
        m={1}
      >
        <Grid container spacing={2}>
          <Grid item>
            Du hast {context.pupil.cards.length} Karten in deiner Lernbox.
          </Grid>
        </Grid>
      </Box>
      <Box display="flex">
        <Button
          variant="contained"
          color="primary"
          onClick={() => history.push("/question")}
          fullWidth
        >
          Lernen
        </Button>
      </Box>
    </>
  );
}
