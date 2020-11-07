import * as React from "react";
import {reactContext} from "../data/Context";
import {Route, Switch, useParams, useRouteMatch} from "react-router";
import {Right} from "../views/Right";
import {Finished} from "../views/Finished";
import {Wrong} from "../views/Wrong";
import {Late} from "../views/Late";
import {Question} from "../views/Question";
import {PupilDelete} from "../views/PupilDelete";
import {Overview} from "../views/Overview";
import {PupilPasswordView} from "../views/PasswordView";

export function PupilRoute() {
    const context = React.useContext(reactContext);
    const {path} = useRouteMatch();
    const {pupilId} = useParams();
    React.useEffect(() => {
            context.currentPupilId = pupilId;
        }, [pupilId, context.currentPupilId],
    );
    const pupil = context.pupil;
    if (!pupil) return <span>Die Schülerdaten konnten nicht geladen werden.</span>;
    if (!context.isTeacher && pupil.password && context.passwordHash(pupil.password) !== context.currentPasswordHash) {
        return <PupilPasswordView/>;
    }
    return (
        <Switch>
            <Route path={`${path}/right`}>
                <Right/>
            </Route>
            <Route path={`${path}/wrong`}>
                <Wrong/>
            </Route>
            <Route path={`${path}/late`}>
                <Late/>
            </Route>
            <Route path={`${path}/question`}>
                <Question/>
            </Route>
            <Route path={`${path}/finished`}>
                <Finished/>
            </Route>
            <Route path={`${path}/delete`}>
                <PupilDelete/>
            </Route>
            <Route path={`${path}/password`}>
                <PupilPasswordView/>
            </Route>
            <Route path={`${path}/`}>
                <Overview/>
            </Route>
        </Switch>
    );
}