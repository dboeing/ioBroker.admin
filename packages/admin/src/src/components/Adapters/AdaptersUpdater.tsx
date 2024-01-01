import React, { Component } from 'react';
import { type Styles, withStyles } from '@mui/styles';
import semver from 'semver';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import {
    Avatar, Button,
    CircularProgress,
    Dialog, DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import InfoIcon from '@mui/icons-material/Info';

import { Utils, I18n } from '@iobroker/adapter-react-v5';

import AdapterUpdateDialog from '../../dialogs/AdapterUpdateDialog';

interface GetNewsResultEntry {
    version: string;
    news: string;
}

const styles = (theme: Record<string, any>) => ({
    smallAvatar: {
        width: theme.spacing(3),
        height: theme.spacing(3),
    },
    listItem: {
        marginBottom: 2,
        background: theme.palette.background,
    },
    toVersion: {
        color: theme.palette.mode === 'dark' ? '#00dc00' : '#008100',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    updateDone: {
        background: '#5ef05e80',
        opacity: 0.7,
    },
    '@media screen and (max-width: 400px)': {
        minWidth: {
            // @ts-expect-error check later
            minWidth: 32,
        },
        listItem:{
            paddingLeft: 2,
        },
    },
    wrapperButton: {
    },
    typography: {
        paddingRight: 30,
    },
    versions: {
        minWidth: 110,
        display: 'inline-block',
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
    languageButton: {
        position: 'absolute',
        right: 52 + parseInt(theme.spacing(1), 10),
        top: theme.spacing(1),
    },
    languageButtonActive: {
        color: theme.palette.primary.main,
    },
    versionHeader: {
        background: '#4dabf5',
        borderRadius: 3,
        paddingLeft: 10,
        fontWeight: 'bold',
        color: theme.palette.mode === 'dark' ? 'black' : 'white',
    },
} satisfies Styles<any, any>);

interface AdaptersUpdaterProps {
    inProcess: boolean;
    lang: ioBroker.Languages;
    /** if process has been stopped, e.g. due to an error */
    stopped: boolean;
    repository: Record<string, any>;
    installed: Record<string, any>;
    onUpdateSelected: (adapters: string[], adapters2?: string[]) => void;
    selected: string[];
    current: string;
    updated: string[];
    finished: boolean;
    noTranslation: boolean;
    toggleTranslation: () => void;
    classes: Record<string, any>;
}

interface AdaptersUpdaterState {
    current: string;
    showNews: null | Record<string, any>;
}

class AdaptersUpdater extends Component<AdaptersUpdaterProps, AdaptersUpdaterState> {
    private readonly updateAvailable: string[];

    /** Key adapterName, value: version */
    private readonly initialVersions: Record<string, string>;

    private readonly currentRef: React.RefObject<HTMLLIElement>;

    constructor(props: AdaptersUpdaterProps) {
        super(props);

        this.updateAvailable = this.detectUpdates();
        this.initialVersions = {};
        this.updateAvailable.forEach(adapter => this.initialVersions[adapter] = this.props.installed[adapter].version);

        this.state = {
            current: this.props.current,
            showNews: null,
        };

        this.currentRef = React.createRef();

        this.props.onUpdateSelected([...this.updateAvailable], this.updateAvailable);
    }

    UNSAFE_componentWillReceiveProps(nextProps: AdaptersUpdaterProps) {
        if (nextProps.current !== this.state.current) {
            this.setState({ current: nextProps.current });
            setTimeout(() =>
                this.currentRef.current?.scrollIntoView(), 200);
        }
    }

    static isUpdateAvailable(oldVersion: string, newVersion: string) {
        try {
            return semver.gt(newVersion, oldVersion);
        } catch (e) {
            console.warn(`Cannot compare "${newVersion}" and "${oldVersion}"`);
            return false;
        }
    }

    detectUpdates(): string[] {
        const updateAvailable: string[] = [];

        Object.keys(this.props.repository).forEach(adapter => {
            const _installed = this.props.installed[adapter];
            // ignore js-controller in this dialog
            if (adapter === 'js-controller' || adapter === 'admin') {
                return;
            }
            if (_installed &&
                _installed.ignoreVersion !== this.props.repository[adapter].version &&
                AdaptersUpdater.isUpdateAvailable(_installed.version, this.props.repository[adapter].version)
            ) {
                // @ts-expect-error should be ok wait for ts port
                if (!AdapterUpdateDialog.checkCondition(this.props.repository[adapter].messages, _installed.version, this.props.repository[adapter].version)) {
                    updateAvailable.push(adapter);
                }
            }
        });

        updateAvailable.sort();

        return updateAvailable;
    }

    getNews(adapter: string): GetNewsResultEntry[] {
        const adapterObj = this.props.repository[adapter];
        const installed  = this.props.installed[adapter];
        const news: GetNewsResultEntry[] = [];

        if (installed && adapterObj?.news) {
            Object.keys(adapterObj.news).forEach(version => {
                try {
                    if (semver.gt(version, installed.version)) {
                        news.push({
                            version,
                            news: this.props.noTranslation ? adapterObj.news[version].en : (adapterObj.news[version][this.props.lang] || adapterObj.news[version].en),
                        });
                    }
                } catch (e) {
                    // ignore it
                    console.warn(`Cannot compare "${version}" and "${installed.version}"`);
                }
            });
        }

        return news;
    }

    renderOneAdapter(adapter: string): React.JSX.Element | null {
        const checked = this.props.selected.includes(adapter);
        if ((this.props.finished || this.props.inProcess) && !checked) {
            return null;
        }
        if (!this.props.installed[adapter]) {
            // during installation, this adapter was uninstalled
            return null;
        }
        const image = `.${this.props.installed[adapter].localIcon}`;

        return <React.Fragment key={adapter}>
            <ListItem
                key={adapter}
                dense
                classes={{ root: Utils.clsx(this.props.classes.listItem, this.props.updated.includes(adapter) && this.props.classes.updateDone) }}
                ref={this.state.current === adapter ? this.currentRef : null}
            >
                <ListItemIcon className={this.props.classes.minWidth}>
                    <Avatar
                        variant="square"
                        alt={adapter}
                        src={image}
                        className={this.props.classes.smallAvatar}
                    />
                </ListItemIcon>
                <ListItemText
                    primary={adapter}
                    title={this.getNews(adapter).map(item => `${item.version}: ${item.news}`).join('\n')}
                    secondary={<span>
                        <div className={this.props.classes.versions}>
                            {this.initialVersions[adapter]}
                            {' '}
                            →
                            <span className={this.props.classes.toVersion}>{this.props.repository[adapter].version}</span>
                        </div>
                        <IconButton
                            title={I18n.t('Show change log')}
                            onClick={() =>
                                this.setState({
                                    showNews: {
                                        adapter,
                                        version: this.props.repository[adapter].version,
                                        fromVersion: this.initialVersions[adapter],
                                    },
                                })}
                            size="small"
                        >
                            <InfoIcon />
                        </IconButton>
                    </span>}
                />
                {!this.props.finished && !this.props.inProcess && <ListItemSecondaryAction>
                    <Checkbox
                        edge="end"
                        checked={checked}
                        tabIndex={-1}
                        disableRipple
                        disabled={this.props.inProcess}
                        onClick={() => {
                            const selected = [...this.props.selected];
                            const pos = selected.indexOf(adapter);
                            if (pos !== -1) {
                                selected.splice(pos, 1);
                            } else {
                                selected.push(adapter);
                                selected.sort();
                            }
                            this.props.onUpdateSelected(selected);
                        }}
                    />
                </ListItemSecondaryAction>}
                {this.state.current === adapter && !this.props.stopped && !this.props.finished && <ListItemSecondaryAction>
                    <CircularProgress />
                </ListItemSecondaryAction>}
            </ListItem>

        </React.Fragment>;
    }

    getReactNews(adapter: string, fromVersion: string): React.JSX.Element[] {
        const adapterObj = this.props.repository[adapter];
        const installed  = this.props.installed[adapter];
        fromVersion = fromVersion || installed.version;
        const result: React.JSX.Element[] = [];

        if (installed && adapterObj?.news) {
            Object.keys(adapterObj.news).forEach(version => {
                try {
                    if (semver.gt(version, fromVersion) && adapterObj.news[version]) {
                        const newsText: string = this.props.noTranslation ?
                            (adapterObj.news[version].en || '') :
                            (adapterObj.news[version][this.props.lang] || adapterObj.news[version].en || '');

                        const news = newsText.split('\n')
                            .map(line => line
                                .trim()
                                .replace(/^\*\s?/, '')
                                .replace(/<!--[^>]*->/, '')
                                .replace(/<! -[^>]*->/, '')
                                .trim())
                            .filter(line => !!line);

                        result.push(<Grid item key={version}>
                            <Typography className={this.props.classes.versionHeader}>
                                {version}
                            </Typography>
                            {news.map((value, index) => <Typography key={`${version}-${index}`} component="div" variant="body2">
                                { `• ${value}`}
                            </Typography>)}
                        </Grid>);
                    }
                } catch (e) {
                    // ignore it
                    console.warn(`Cannot compare "${version}" and "${fromVersion}"`);
                }
            });
        }

        return result;
    }

    renderShowNews() {
        if (this.state.showNews) {
            const news = this.getReactNews(this.state.showNews.adapter, this.state.showNews.fromVersion);

            return <Dialog
                onClose={() => this.setState({ showNews: null })}
                open={!0}
            >
                <DialogTitle>
                    <Typography component="h2" variant="h6" classes={{ root: this.props.classes.typography }}>
                        <div style={{ width: 'calc(100% - 60px)' }}>{I18n.t('Update "%s" to v%s', this.state.showNews.adapter, this.state.showNews.version)}</div>
                        <IconButton size="large" className={this.props.classes.closeButton} onClick={() => this.setState({ showNews: null })}>
                            <CloseIcon />
                        </IconButton>
                        {I18n.getLanguage() !== 'en' && this.props.toggleTranslation ? <IconButton
                            size="large"
                            className={Utils.clsx(this.props.classes.languageButton, this.props.noTranslation && this.props.classes.languageButtonActive)}
                            onClick={this.props.toggleTranslation}
                            title={I18n.t('Disable/Enable translation')}
                        >
                            <LanguageIcon />
                        </IconButton> : null}
                    </Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <Grid
                        container
                        direction="column"
                        spacing={2}
                        wrap="nowrap"
                    >
                        {news.length ? <Grid item>
                            <Typography variant="h6" gutterBottom>{I18n.t('Change log')}</Typography>
                            <Grid
                                container
                                spacing={2}
                                direction="column"
                                wrap="nowrap"
                            >
                                {news}
                            </Grid>
                        </Grid> : I18n.t('No change log available')}
                    </Grid>
                </DialogContent>
                <DialogActions className={this.props.classes.wrapperButton}>
                    <Button
                        variant="contained"
                        onClick={() => this.setState({ showNews: null })}
                        // @ts-expect-error this is fine
                        color="grey"
                        startIcon={<CloseIcon />}
                    >
                        {I18n.t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>;
        }
        return null;
    }

    render() {
        return <List className={this.props.classes.root}>
            {this.updateAvailable.map(adapter => this.renderOneAdapter(adapter))}
            {this.renderShowNews()}
        </List>;
    }
}

// @ts-expect-error investigate why it doesn't like the media screen prop in the style
export default withStyles(styles)(AdaptersUpdater);
