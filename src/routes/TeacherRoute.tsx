import * as React from "react";
import {reactContext} from "../data/Context";
import {Route, Switch, useRouteMatch} from "react-router";
import {ScreenBox} from "../layout/Screenbox";
import {TeacherPasswordView} from "../views/PasswordView";
import {SynchronizationView} from "../views/SynchronizationView";
import {EditCard} from "../views/EditCard";
import {CardListView} from "../views/CardListView";
import {PupilList} from "../views/PupilList";

export function TeacherRoute() {
    const context = React.useContext(reactContext);
    const {path} = useRouteMatch();
    if (!context.isTeacher) return <ScreenBox><TeacherPasswordView/></ScreenBox>;
    return (
        <Switch>
            <Route path={[`${path}/edit/new`, `${path}/edit/:cardId`, `${path}/edit`]}>
                <ScreenBox fullScreen>
                    <EditCard/>
                </ScreenBox>
            </Route>
            <Route path={`${path}/list`}>
                <ScreenBox fullScreen>
                    <CardListView/>
                </ScreenBox>
            </Route>
            <Route>
                <ScreenBox>
                    <PupilList/>
                </ScreenBox>
            </Route>
        </Switch>
    );
}