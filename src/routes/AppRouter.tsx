import * as React from "react";
import {BrowserRouter} from "react-router-dom";
import {ErrorBoundary} from "../util/ErrorBoundary";
import App from "./App";
import "../layout/styles.css";

export function AppRouter() {
    return (<BrowserRouter>
        <ErrorBoundary>
            <App/>
        </ErrorBoundary>
    </BrowserRouter>);
}
