import * as React from "react";
import { reactContext } from "./Context";
import { useHistory } from "react-router-dom";
import { TextField, Button, Box, Typography } from "@material-ui/core";

export function Question() {
  const context = React.useContext(reactContext);
  const history = useHistory();
  const [input, setInput] = React.useState("");
  function check() {
    if (!context.card) return;
    if (input === context.card.answer) {
      context.card.slot = (context.card.slot || 0) + 1;
      history.push("/right");
    } else {
      context.card.slot = 0;
      history.push("/wrong");
    }
  }
  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        textAlign="center"
        flexGrow={1}
        m={1}
      >
        <Typography variant="h5">Gib die Antwort ein</Typography>
        <TextField
          autoFocus
          label="Antwort"
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyPress={ev => {
            if (ev.key === "Enter") {
              check();
              ev.preventDefault();
            }
          }}
        />
      </Box>
      <Box display="flex">
        <Button variant="contained" onClick={check} fullWidth>
          Abschicken
        </Button>
      </Box>
    </>
  );
}
