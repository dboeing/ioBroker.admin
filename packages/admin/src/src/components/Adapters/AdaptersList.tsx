import React, { Component, Fragment } from 'react';
import { withStyles } from '@mui/styles';

import {
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';

import type { IobTheme } from '@iobroker/adapter-react-v5';

import type { AdaptersContext } from '@/components/Adapters/AdapterInstallDialog';
import TabContent from '@/components/TabContent';
import Utils from '@/components/Utils';
import AdapterCategoryRow from '@/components/Adapters/AdapterCategoryRow';
import AdapterTile from '@/components/Adapters/AdapterTile';
import AdapterRow from '@/components/Adapters/AdapterRow';
import type { AdapterCacheEntry } from '@/components/Adapters/AdapterGeneric';

export const WIDTHS: Record<string, number> = {
    emptyBlock: 50,
    name: 300,
    connectionType: 120,
    installed: 120,
    available: 120,
    update: 40,
    license: 80,
    install: 34 * 7 + 8,
};

export const SUM = Object.keys(WIDTHS).reduce((s, i) => s + WIDTHS[i], 0);

const styles: Record<string, any> = (theme: IobTheme) => ({
    container: {
        height: '100%',
        width: '100%',
    },
    containerNotFullHeight: {
        height: 'calc(100% - 22px)',
    },
    containerFullHeight: {
        height: '100%',
    },
    table: {
        width: '100%',
        tableLayout: 'fixed',
        minWidth: 960,
        '& td': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingTop: 2,
            paddingBottom: 2,
            paddingRight: 4,
            paddingLeft: 4,
        },
        '& th': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingTop: 2,
            paddingBottom: 2,
            paddingRight: 4,
            paddingLeft: 4,
        },
    },
    name: {
        flexWrap: 'nowrap',
        width: WIDTHS.name,
    },
    emptyBlock: {
        flexWrap: 'nowrap',
        width: WIDTHS.emptyBlock,
    },
    description: {
        width: `calc(100% - ${SUM + 2}px)`,
    },
    connectionType: {
        width: WIDTHS.connectionType,
    },
    installed: {
        width: WIDTHS.installed,
    },
    available: {
        width: WIDTHS.available,
        paddingRight: 6,
    },
    update: {
        width: WIDTHS.update,
        padding: 0,
    },
    license: {
        width: WIDTHS.license,
    },
    install: {
        width: WIDTHS.install,
    },
    notStableRepo: {
        background: theme.palette.mode === 'dark' ? '#8a7e00' : '#fdee20',
        color: '#000',
        fontSize: 14,
        padding: '2px 8px',
        borderRadius: 5,
    },
    viewModeDiv: {
        display: 'flex',
        flexFlow: 'wrap',
        overflow: 'auto',
        justifyContent: 'center',
    },
});

interface AdaptersListProps {
    classes: Record<string, string>;
    stableRepo: boolean;
    repoName: string;
    context: AdaptersContext;
    systemConfig: ioBroker.SystemConfigObject;
    tableViewMode: boolean;
    listOfVisibleAdapter: string[] | null;
    categoriesExpanded: Record<string, boolean>;
    oneListView: boolean;
    cachedAdapters: { [adapterName: string]: AdapterCacheEntry } | null;
    categories: {
        name: string;
        translation: string;
        count: number;
        installed: number;
        adapters: string[];
    }[];
    toggleCategory: (category: string) => void;
    clearAllFilters: () => void;
    update: boolean;
    descWidth: number;
    sortByName: boolean;
    sortPopularFirst: boolean;
    sortRecentlyUpdated: boolean;
}

interface AdaptersListState {
    descWidth: number;
    repoName: string;
    systemConfig: boolean;
    tableViewMode: boolean;
    oneListView: boolean;
    categoriesExpanded: string;
    cachedAdapters: number;
    listOfVisibleAdapter: string;
    update: boolean;
    sortByName: boolean;
    sortPopularFirst: boolean;
    sortRecentlyUpdated: boolean;
    renderCounter: number;
}

class AdaptersList extends Component<AdaptersListProps, AdaptersListState> {
    private lastRenderCounter: number = -1;

    constructor(props: AdaptersListProps) {
        super(props);

        this.state = {
            descWidth: props.descWidth,
            repoName: props.repoName,
            systemConfig: !!props.systemConfig,
            tableViewMode: props.tableViewMode,
            oneListView: props.oneListView,
            categoriesExpanded: JSON.stringify(props.categoriesExpanded),
            cachedAdapters: props.cachedAdapters ? Object.keys(props.cachedAdapters).length : 0,
            update: props.update,
            sortByName: props.sortByName,
            sortPopularFirst: props.sortPopularFirst,
            sortRecentlyUpdated: props.sortRecentlyUpdated,
            renderCounter: 0,
            listOfVisibleAdapter: JSON.stringify(props.listOfVisibleAdapter),
        };
    }

    getRow(adapterName: string, context: AdaptersContext) {
        const cached = this.props.cachedAdapters[adapterName];
        if (cached) {
            return <AdapterRow
                context={context}
                key={`adapter-${adapterName}`}
                adapterName={adapterName}
                cached={cached}
            />;
        }
        return null;
    }

    getRows(context: AdaptersContext) {
        if (!this.props.listOfVisibleAdapter) {
            return <TableRow>
                <TableCell colSpan={8}>
                    <LinearProgress />
                </TableCell>
            </TableRow>;
        }

        let count = 0;

        let rows: React.JSX.Element[] = [];

        if (this.props.oneListView) {
            for (let i = 0; i < this.props.listOfVisibleAdapter.length; i++) {
                const adapterName = this.props.listOfVisibleAdapter[i];

                if (rows.length > 50 && !this.props.context.installed[adapterName]?.version) {
                    continue;
                }
                rows.push(this.getRow(adapterName, context));
            }
            count = rows.length;

            if (count && this.props.listOfVisibleAdapter.length > rows.length) {
                rows.push(<TableRow
                    key="more"
                >
                    <TableCell colSpan={8} style={{ fontSize: 20, padding: 20, textAlign: 'center' }}>
                        {this.props.context.t('Filter adapters to see others. There is %s more', this.props.listOfVisibleAdapter.length - rows.length)}
                    </TableCell>
                </TableRow>);
            }
        } else {
            rows = this.props.categories.map(category => {
                const showCategory = category.adapters.find(adapterName => this.props.listOfVisibleAdapter.includes(adapterName));
                if (!showCategory) {
                    return null;
                }
                const categoryName = category.name;
                const expanded = this.props.categoriesExpanded[categoryName];
                count++;

                return <Fragment key={`category-${categoryName} ${category.adapters.length}`}>
                    <AdapterCategoryRow
                        key={`category-${categoryName}${1}`}
                        categoryName={categoryName}
                        count={category.count}
                        expanded={expanded}
                        installedCount={category.installed}
                        name={category.translation}
                        descHidden={context.descHidden}
                        onToggle={() => this.props.toggleCategory(categoryName)}
                        t={this.props.context.t}
                    />

                    {expanded &&
                        category.adapters.map(adapterName => {
                            const item = this.getRow(adapterName, context);
                            item && count++;
                            return item;
                        })}
                </Fragment>;
            });
        }

        if (!count) {
            return !this.props.update && <tr>
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                <td
                    colSpan={4}
                    style={{
                        padding: 16,
                        fontSize: 18,
                        cursor: 'pointer',
                    }}
                    title={this.props.context.t('Click to clear all filters')}
                    onClick={() => this.props.clearAllFilters()}
                >
                    {this.props.context.t('all items are filtered out')}
                </td>
            </tr>;
        }

        return rows;
    }

    getTiles(context: AdaptersContext) {
        if (!this.props.listOfVisibleAdapter) {
            return <LinearProgress />;
        }

        if (!this.props.listOfVisibleAdapter.length) {
            return !this.props.update && <div
                style={{
                    margin: 20,
                    fontSize: 26,
                }}
                title={this.props.context.t('Click to clear all filters')}
                onClick={() => this.props.clearAllFilters()}
            >
                {this.props.context.t('all items are filtered out')}
            </div>;
        }
        const items: React.JSX.Element[] = [];

        for (let i = 0; i < this.props.listOfVisibleAdapter.length; i++) {
            const adapterName = this.props.listOfVisibleAdapter[i];
            const cached = this.props.cachedAdapters[adapterName];

            if (items.length > 50 && !this.props.context.installed[adapterName]?.version) {
                continue;
            }
            items.push(<AdapterTile
                key={`adapter-${adapterName}`}
                context={context}
                adapterName={adapterName}
                cached={cached}
            />);
        }
        if (this.props.listOfVisibleAdapter.length > items.length) {
            items.push(<div
                key="newLine"
                style={{
                    flexBasis: '100%',
                    height: 0,
                }}
            />);
            items.push(<div
                key="more"
                style={{ fontSize: 20, margin: 20 }}
            >
                {this.props.context.t('Filter adapters to see others. There is %s more', this.props.listOfVisibleAdapter.length - items.length)}
            </div>);
        }

        return items;
    }

    renderTileView(stableRepo: boolean, repoName: string, context: AdaptersContext) {
        return <>
            {!stableRepo ? <div className={this.props.classes.notStableRepo}>
                {this.props.context.t('Active repo is "%s"', repoName)}
            </div> : null}
            <div className={this.props.classes.viewModeDiv}>{this.getTiles(context)}</div>
        </>;
    }

    renderTableView(stableRepo: boolean, repoName: string, context: AdaptersContext) {
        const classes = this.props.classes;
        return <TabContent>
            {!stableRepo ? <div className={this.props.classes.notStableRepo}>
                {this.props.context.t('Active repo is "%s"', repoName)}
            </div> : null}
            <TableContainer
                className={Utils.clsx(
                    classes.container,
                    !stableRepo ? classes.containerNotFullHeight : classes.containerFullHeight,
                )}
            >
                <Table stickyHeader size="small" className={classes.table}>
                    <TableHead>
                        <TableRow>
                            <TableCell className={classes.emptyBlock}></TableCell>
                            <TableCell className={classes.name}>
                                <Typography>{this.props.context.t('Name')}</Typography>
                            </TableCell>
                            {!context.descHidden && (
                                <TableCell className={classes.description} style={{ width: this.props.descWidth }}>
                                    <Typography>{this.props.context.t('Description')}</Typography>
                                </TableCell>
                            )}
                            <TableCell className={classes.connectionType} />
                            <TableCell className={classes.installed}>
                                <Typography>{this.props.context.t('Installed')}</Typography>
                            </TableCell>
                            <TableCell className={classes.available}>
                                <Typography>{this.props.context.t('Available')}</Typography>
                            </TableCell>
                            <TableCell className={classes.license}>
                                <Typography>{this.props.context.t('License')}</Typography>
                            </TableCell>
                            <TableCell className={classes.install}>
                                <Typography>{this.props.context.t('Install')}</Typography>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>{this.getRows(context)}</TableBody>
                </Table>
            </TableContainer>
        </TabContent>;
    }

    static getDerivedStateFromProps(props: AdaptersListProps, state: AdaptersListState) {
        let changed = false;
        // rewrite only if view mode changed, count of adapters in the list
        if (props.descWidth !== state.descWidth) {
            console.log('Render because of descWidth');
            changed = true;
        }
        if (props.repoName !== state.repoName) {
            console.log('Render because of repoName');
            changed = true;
        }
        if (!!props.systemConfig !== state.systemConfig) {
            console.log('Render because of systemConfig');
            changed = true;
        }
        if (props.tableViewMode !== state.tableViewMode) {
            console.log('Render because of tableViewMode');
            changed = true;
        }
        if (props.oneListView !== state.oneListView) {
            console.log('Render because of oneListView');
            changed = true;
        }
        const categoriesExpanded = JSON.stringify(props.categoriesExpanded);
        if (categoriesExpanded !== state.categoriesExpanded) {
            console.log('Render because of categoriesExpanded');
            changed = true;
        }
        const cachedAdapters = props.cachedAdapters ? Object.keys(props.cachedAdapters).length : 0;
        if (cachedAdapters !== state.cachedAdapters) {
            console.log(`Render because of cachedAdapters ${cachedAdapters} <> ${state.cachedAdapters}`);
            changed = true;
        }
        if (props.update !== state.update) {
            console.log('Render because of update');
            changed = true;
        }
        if (props.sortByName !== state.sortByName) {
            console.log('Render because of sortByName');
            changed = true;
        }
        if (props.sortPopularFirst !== state.sortPopularFirst) {
            console.log('Render because of sortPopularFirst');
            changed = true;
        }
        if (props.sortRecentlyUpdated !== state.sortRecentlyUpdated) {
            console.log('Render because of sortRecentlyUpdated');
            changed = true;
        }
        const listOfVisibleAdapter = JSON.stringify(props.listOfVisibleAdapter);
        if (listOfVisibleAdapter !== state.listOfVisibleAdapter) {
            console.log('Render because of listOfVisibleAdapter');
            changed = true;
        }
        if (changed) {
            return {
                descWidth: props.descWidth,
                repoName: props.repoName,
                systemConfig: !!props.systemConfig,
                tableViewMode: props.tableViewMode,
                oneListView: props.oneListView,
                categoriesExpanded,
                cachedAdapters,
                update: props.update,
                sortByName: props.sortByName,
                sortPopularFirst: props.sortPopularFirst,
                sortRecentlyUpdated: props.sortRecentlyUpdated,
                listOfVisibleAdapter,
                renderCounter: state.renderCounter + 1,
            };
        }

        return null;
    }

    shouldComponentUpdate(nextProps: Readonly<AdaptersListProps>, nextState: Readonly<AdaptersListState>): boolean {
        if (this.lastRenderCounter !== nextState.renderCounter) {
            this.lastRenderCounter = nextState.renderCounter;
            return true;
        }

        return false;
    }

    render() {
        if (!this.props.systemConfig?.common?.activeRepo) {
            return <LinearProgress />;
        }
        console.log('Render list');
        if (this.props.tableViewMode) {
            return this.renderTableView(this.props.stableRepo, this.props.repoName, this.props.context);
        }
        return this.renderTileView(this.props.stableRepo, this.props.repoName, this.props.context);
    }
}

export default withStyles(styles)(AdaptersList);
