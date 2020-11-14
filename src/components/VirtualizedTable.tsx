import * as React from "react";
import clsx from 'clsx';
import {createStyles, Theme, withStyles, WithStyles} from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import {AutoSizer, Column, Table, TableCellRenderer, TableHeaderProps} from 'react-virtualized';

declare module '@material-ui/core/styles/withStyles' {
    // Augment the BaseCSSProperties so that we can control jss-rtl
    interface BaseCSSProperties {
        /*
         * Used to control if the rule-set should be affected by rtl transformation
         */
        flip?: boolean;
    }
}

const styles = (theme: Theme) =>
    createStyles({
        flexContainer: {
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
        },
        table: {
            // temporary right-to-left patch, waiting for
            // https://github.com/bvaughn/react-virtualized/issues/454
            '& .ReactVirtualized__Table__headerRow': {
                flip: false,
                paddingRight: theme.direction === 'rtl' ? '0px !important' : undefined,
            },
        },
        tableRow: {
            cursor: 'pointer',
        },
        tableRowHover: {
            '&:hover': {
                backgroundColor: theme.palette.grey[200],
            },
        },
        tableCell: {
            flex: 1,
        },
        noClick: {
            cursor: 'initial',
        },
    });

interface ColumnData<Data> {
    dataKey: keyof Data;
    label: string|React.ReactElement;
    numeric?: boolean;
    width: number;
}

interface Row {
    index: number;
}

interface MuiVirtualizedTableProps<Data> extends WithStyles<typeof styles> {
    columns: Array<ColumnData<Data>>;
    headerHeight?: number;
    onRowClick?: () => void;
    rowCount: number;
    rowGetter: (row: Row) => Data;
    rowHeight?: number;
    height?: number;
}

class MuiVirtualizedTable<Data> extends React.PureComponent<MuiVirtualizedTableProps<Data>> {
    static defaultProps = {
        headerHeight: 48,
        rowHeight: 48,
    };

    getRowClassName = ({index}: Row) => {
        const {classes, onRowClick} = this.props;

        return clsx(classes.tableRow, classes.flexContainer, {
            [classes.tableRowHover]: index !== -1 && onRowClick != null,
        });
    };

    cellRenderer: TableCellRenderer = ({cellData, columnIndex}) => {
        const {columns, classes, rowHeight, onRowClick} = this.props;
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, {
                    [classes.noClick]: onRowClick == null,
                })}
                variant="body"
                style={{height: rowHeight}}
                align={(columnIndex != null && columns[columnIndex].numeric) || false ? 'right' : 'left'}
            >
                {cellData}
            </TableCell>
        );
    };

    headerRenderer = ({label, columnIndex}: TableHeaderProps & { columnIndex: number }) => {
        const {headerHeight, columns, classes} = this.props;

        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
                variant="head"
                style={{height: headerHeight}}
                align={columns[columnIndex].numeric || false ? 'right' : 'left'}
            >
                <span>{label}</span>
            </TableCell>
        );
    };

    render() {
        const {classes, columns, rowHeight, headerHeight, height: fixedHeight, ...tableProps} = this.props;
        return (
            <AutoSizer>
                {({height, width}) => (
                    <Table
                        height={fixedHeight || height}
                        width={width}
                        rowHeight={rowHeight!}
                        gridStyle={{
                            direction: 'inherit',
                        }}
                        headerHeight={headerHeight!}
                        className={classes.table}
                        {...tableProps}
                        rowClassName={this.getRowClassName}
                    >
                        {columns.map(({dataKey, ...other}, index) => {
                            return (
                                <Column
                                    key={dataKey as string}
                                    headerRenderer={(headerProps) =>
                                        this.headerRenderer({
                                            ...headerProps,
                                            columnIndex: index,
                                        })
                                    }
                                    className={classes.flexContainer}
                                    cellRenderer={this.cellRenderer}
                                    dataKey={dataKey as string}
                                    {...other}
                                />
                            );
                        })}
                    </Table>
                )}
            </AutoSizer>
        );
    }
}

export class VirtualizedTable<T> extends React.Component<VirtualizedTable<T>["C"] extends React.ComponentType<infer P> ? P : never,
    {}> {
    private readonly C = withStyles(styles)(
        (props: JSX.LibraryManagedAttributes<typeof MuiVirtualizedTable, MuiVirtualizedTable<T>["props"]>) =>
            <MuiVirtualizedTable<T> {...props} />);

    render() {
        return <this.C {...this.props} />;
    }
}