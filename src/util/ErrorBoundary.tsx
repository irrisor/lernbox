import * as React from "react";
import {ErrorInfo} from "react";

export class ErrorBoundary extends React.Component {
    state: { error?: any };

    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = {error: false};
    }

    static getDerivedStateFromError(error: any) {
        // Update state so the next render will show the fallback UI.
        return {hasError: error};
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Error while rendering", error, errorInfo.componentStack);
        this.setState({error});
    }

    render() {
        if (this.state.error) {
            console.error("Error rendering", this.state.error);
            return <div><h1>Es ist ein Fehler aufgetreten</h1>Bitte kontaktieren Sie die Lehrkraft bzw. den
                Administrator, wenn das Problem bestehen bleibt.</div>;
        }

        return this.props.children;
    }
}