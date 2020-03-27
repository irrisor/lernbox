import * as React from "react";
import "./styles.css";
import { reactContext, Context } from "./Context";
import { Bar } from "./Bar";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Question } from "./Question";
import { Front } from "./Front";
import { PupilList } from "./PupilList";
import { Overview } from "./Overview";
import { Box } from "@material-ui/core";

export default function App() {
  const ContextProvider = reactContext.Provider;
  const [context, setContext] = React.useState(new Context());
  context.setContext = setContext;

  return (
    <ContextProvider value={context}>
      <Router>
        <Box
          display="flex"
          flexDirection="column"
          height="100%"
          bgcolor="background.default"
          maxHeight={750}
        >
          <Bar />
          <Box
            display="flex"
            p={1}
            flexGrow={1}
            flexDirection="column"
            maxWidth="600px"
            mx="auto"
          >
            <Switch>
              <Route path="/right">
                <Front />
                <p>Yes</p>
              </Route>
              <Route path="/wrong">
                <Front />
                <p>No</p>
              </Route>
              <Route path="/question">
                <Front />
                <Question />
              </Route>
              <Route path="/">
                {context.pupilName ? <Overview /> : <PupilList />}
              </Route>
            </Switch>
          </Box>
        </Box>
      </Router>
    </ContextProvider>
  );
}
