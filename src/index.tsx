import 'ts-polyfill';
import * as React from "react";
import { render } from "react-dom";

import {AppRouter} from "./AppRouter";

const rootElement = document.getElementById("root");
render(<AppRouter/>, rootElement);
