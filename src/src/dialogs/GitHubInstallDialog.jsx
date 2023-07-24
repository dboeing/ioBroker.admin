import React, { useCallback, useState } from 'react';

import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {
    AppBar,
    Box,
    Checkbox,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Tab,
    Tabs,
    TextField,
    Autocomplete,
} from '@mui/material';
import { makeStyles } from '@mui/styles';

import { FaGithub as GithubIcon } from 'react-icons/fa';
import UrlIcon from '@mui/icons-material/Language';
import SmsIcon from '@mui/icons-material/Sms';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';

import { I18n, Icon } from '@iobroker/adapter-react-v5';

import npmIcon from '../assets/npm.png';

function TabPanel(props) {
    const {
        children, value, index, ...other
    } = props;

    return <div
        role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`}
        {...other}
    >
        {value === index && <Box style={{ paddingTop: 10 }} p={3}>
            <Typography component="div">{children}</Typography>
        </Box>}
    </div>;
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `full-width-tab-${index}`,
        'aria-controls': `full-width-tabpanel-${index}`,
    };
}

const useStyles = makeStyles(theme => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        width: '100%',
        height: '100%',
    },
    paper: {
        maxWidth: 1000,
    },
    tabPaper: {
        padding: theme.spacing(2),
    },
    title: {
        marginTop: 10,
        padding: theme.spacing(1),
        marginLeft: theme.spacing(1),
        fontSize: 18,
        color: theme.palette.primary.main,
    },
    warningText: {
        color: '#f53939',
    },
    noteText: {
        marginTop: theme.spacing(2),
    },
    errorTextNoGit: {
        fontSize: 13,
        color: '#ff1616',
    },
    listIcon: {
        width: 24,
        height: 24,
    },
    listIconWithMargin: {
        width: 24,
        height: 24,
        marginRight: 8,
    },
    tabSelected: {
        color: theme.palette.mode === 'dark' ? theme.palette.secondary.contrastText : '#FFFFFF !important',
    },
}));

// some older browsers do not have `flat`
if (!Array.prototype.flat) {
    // eslint-disable-next-line
    Object.defineProperty(Array.prototype, 'flat', {
        configurable: true,
        value: function flat() {
            // eslint-disable-next-line
            const depth = Number.isNaN(arguments[0]) ? 1 : Number(arguments[0]);

            return depth ? Array.prototype.reduce.call(this, (acc, cur) => {
                if (Array.isArray(cur)) {
                    // eslint-disable-next-line prefer-spread
                    acc.push.apply(acc, flat.call(cur, depth - 1));
                } else {
                    acc.push(cur);
                }

                return acc;
            }, []) : Array.prototype.slice.call(this);
        },
        writable: true,
    });
}

const GitHubInstallDialog = ({
    categories, repository, onClose, installFromUrl, t,
}) => {
    t = t || I18n.t;

    const classes = useStyles();
    const [autocompleteValue, setAutocompleteValue] = useState((window._localStorage || window.localStorage).getItem('App.autocomplete') || null);
    const [debug, setDebug] = useState((window._localStorage || window.localStorage).getItem('App.gitDebug') === 'true');
    const [url, setUrl] = useState((window._localStorage || window.localStorage).getItem('App.userUrl') || '');
    const [currentTab, setCurrentTab] = useState((window._localStorage || window.localStorage).getItem('App.gitTab') || 'npm');

    // eslint-disable-next-line array-callback-return
    const list = useCallback(() => {
        const adapters = categories
            .map(category => category.adapters)
            .flat()
            .sort();

        return adapters
            .map((el, i) => {
                if (i && adapters[i - 1] === el) {
                    return null;
                }
                const adapter = repository[el];
                if (!adapter?.controller) {
                    const parts = (adapter.extIcon || adapter.meta || adapter.readme || '').toString().split('/');

                    let name = adapter?.name;
                    if (!name) {
                        name = adapter.titleLang;
                        if (name && typeof name === 'object') {
                            name = name[I18n.getLanguage()] || name.en;
                        } else {
                            name = adapter.title || el;
                        }
                    }

                    return {
                        value: `${el}/${parts[3]}`,
                        name: `${name} [${parts[3]}]`,
                        icon: adapter.extIcon || adapter.icon,
                        nogit: !!adapter.nogit,
                        title: el,
                    };
                }
                return null;
            })
            .filter(it => it)
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    }, [categories, repository]);

    const closeInit = () => {
        setAutocompleteValue(null);
        setUrl('');
    };

    const _list = currentTab !== 'URL' ? list() : null;

    return <Dialog
        onClose={onClose}
        open={!0}
        classes={{ paper: classes.paper }}
    >
        <DialogContent dividers>
            <div className={classes.root}>
                <AppBar position="static" color="default">
                    <Tabs
                        value={currentTab}
                        onChange={(e, newTab) => {
                            (window._localStorage || window.localStorage).setItem('App.gitTab', newTab);
                            setCurrentTab(newTab);
                        }}
                        variant="fullWidth"
                        indicatorColor="secondary"
                    >
                        <Tab
                            label={t('From npm')}
                            wrapped
                            classes={{ selected: classes.tabSelected }}
                            icon={<img src={npmIcon} alt="npm" width={24} height={24} />}
                            {...a11yProps(0)}
                            value="npm"
                        />
                        <Tab
                            label={t('From github')}
                            wrapped
                            classes={{ selected: classes.tabSelected }}
                            icon={<GithubIcon style={{ width: 24, height: 24 }} width={24} height={24} />}
                            {...a11yProps(0)}
                            value="GitHub"
                        />
                        <Tab
                            label={t('Custom')}
                            wrapped
                            classes={{ selected: classes.tabSelected }}
                            icon={<UrlIcon width={24} height={24} />}
                            {...a11yProps(1)}
                            value="URL"
                        />
                    </Tabs>
                </AppBar>
                <div className={classes.title}>
                    {t('Install or update the adapter from %s', currentTab || 'npm')}
                </div>
                {currentTab === 'npm' ? <Paper className={classes.tabPaper}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={debug}
                                    onChange={e => {
                                        (window._localStorage || window.localStorage).setItem('App.gitDebug', e.target.checked ? 'true' : 'false');
                                        setDebug(e.target.checked);
                                    }}
                                />
                            }
                            label={t('Debug outputs')}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <SmsIcon style={{ marginRight: 10 }} />
                        <Autocomplete
                            fullWidth
                            value={autocompleteValue}
                            onChange={(_, newValue) => {
                                (window._localStorage || window.localStorage).setItem('App.autocomplete', newValue);
                                setAutocompleteValue(newValue);
                            }}
                            options={_list}
                            getOptionLabel={option => option.name}
                            renderInput={params => {
                                const _params = { ...params };
                                _params.InputProps = _params.InputProps || {};
                                _params.InputProps.startAdornment = <InputAdornment position="start">
                                    <Icon src={autocompleteValue?.icon || ''} className={classes.listIcon} />
                                </InputAdornment>;

                                return <TextField
                                    variant="standard"
                                    {...params}
                                    label={I18n.t('Select adapter')}
                                />;
                            }}
                            renderOption={(props, option) =>
                                <Box
                                    component="li"
                                    sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                                    {...props}
                                >
                                    <Icon src={option.icon || ''} className={classes.listIconWithMargin} />
                                    {option.name}
                                </Box>}
                        />
                    </div>
                    <div style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        marginTop: 40,
                    }}
                    >
                        {t('Warning!')}
                    </div>
                    <div className={classes.warningText}>
                        {t('npm_warning', 'NPM', 'NPM')}
                    </div>
                    <div className={classes.noteText}>
                        {t('github_note')}
                    </div>
                </Paper> : null}
                {currentTab === 'GitHub' ? <Paper className={classes.tabPaper}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={debug}
                                    onChange={e => {
                                        (window._localStorage || window.localStorage).setItem('App.gitDebug', e.target.checked ? 'true' : 'false');
                                        setDebug(e.target.checked);
                                    }}
                                />
                            }
                            label={t('Debug outputs')}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <SmsIcon style={{ marginRight: 10 }} />
                        <Autocomplete
                            fullWidth
                            value={autocompleteValue}
                            getOptionDisabled={option => option.nogit}
                            renderOption={(props, option) =>
                                <Box
                                    component="li"
                                    sx={{ '& > img': { mr: 2, flexShrink: 0 } }}
                                    {...props}
                                >
                                    <Icon src={option.icon || ''} className={classes.listIconWithMargin} />
                                    {option.name}
                                    {option.nogit && <div
                                        className={classes.errorTextNoGit}
                                    >
                                        {I18n.t('This adapter cannot be installed from git as must be built before installation.')}
                                    </div>}
                                </Box>}
                            onChange={(_, newValue) => {
                                (window._localStorage || window.localStorage).setItem('App.autocomplete', newValue);
                                setAutocompleteValue(newValue);
                            }}
                            options={_list}
                            getOptionLabel={option => option.name}
                            renderInput={params => {
                                const _params = { ...params };
                                _params.InputProps = _params.InputProps || {};
                                _params.InputProps.startAdornment = <InputAdornment position="start">
                                    <Icon src={autocompleteValue?.icon || ''} className={classes.listIconWithMargin} />
                                </InputAdornment>;

                                return <TextField
                                    variant="standard"
                                    {...params}
                                    label={I18n.t('Select adapter')}
                                />;
                            }}
                        />
                    </div>
                    <div style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        marginTop: 40,
                    }}
                    >
                        {t('Warning!')}
                    </div>
                    <div className={classes.warningText}>
                        {t('github_warning', 'GitHub', 'GitHub')}
                    </div>
                    <div className={classes.noteText}>
                        {t('github_note')}
                    </div>
                </Paper> : null}
                {currentTab === 'URL' ? <Paper className={classes.tabPaper}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            variant="standard"
                            fullWidth
                            label={t('URL')}
                            helperText={t('URL or file path')}
                            value={url}
                            onChange={event => {
                                (window._localStorage || window.localStorage).setItem('App.userUrl', event.target.value);
                                setUrl(event.target.value);
                            }}
                            onKeyUp={event => {
                                if (event.keyCode === 13 && url) {
                                    if (!url.includes('.')) {
                                        installFromUrl(`iobroker.${url}`, debug, true);
                                    } else {
                                        installFromUrl(url, debug, true);
                                    }
                                }
                            }}
                            InputProps={{
                                endAdornment: url ? <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setUrl('')}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                </InputAdornment> : null,
                            }}
                        />
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={debug}
                                    onChange={e => {
                                        (window._localStorage || window.localStorage).setItem('App.gitDebug', e.target.checked ? 'true' : 'false');
                                        setDebug(e.target.checked);
                                    }}
                                />
                            }
                            label={t('Debug outputs')}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 'bold',
                            marginTop: 40,
                        }}
                    >
                        {t('Warning!')}
                    </div>
                    <div className={classes.warningText}>
                        {t('github_warning', 'URL', 'URL')}
                    </div>
                    <div className={classes.noteText}>
                        {t('github_note')}
                    </div>
                </Paper> : null}
            </div>
        </DialogContent>
        <DialogActions>
            <Button
                variant="contained"
                disabled={((currentTab === 'GitHub' || currentTab === 'npm') && !autocompleteValue) || (currentTab === 'URL' && !url)}
                autoFocus
                onClick={() => {
                    if (currentTab === 'GitHub') {
                        const parts = (autocompleteValue?.value || '').split('/');
                        // const _url = 'https://github.com/' + parts[1] + '/ioBroker.' + parts[0] + '/tarball/master';
                        const _url = `${parts[1]}/ioBroker.${parts[0]}`;
                        installFromUrl(_url, debug, true);
                    } else if (currentTab === 'URL') {
                        if (!url.includes('.')) {
                            installFromUrl(`iobroker.${url}`, debug, true);
                        } else {
                            installFromUrl(url, debug, true);
                        }
                    } else if (currentTab === 'npm') {
                        const parts = (autocompleteValue?.value || '').split('/');
                        if (!parts[0].includes('.')) {
                            installFromUrl(`iobroker.${parts[0]}`, debug, true);
                        } else {
                            installFromUrl(parts[0], debug, true);
                        }
                    }
                    onClose();
                    closeInit();
                }}
                color="primary"
                startIcon={<CheckIcon />}
            >
                {t('Install')}
            </Button>
            <Button
                variant="contained"
                onClick={() => {
                    onClose();
                    closeInit();
                }}
                color="grey"
                startIcon={<CloseIcon />}
            >
                {t('Close')}
            </Button>
        </DialogActions>
    </Dialog>;
};

export default GitHubInstallDialog;
