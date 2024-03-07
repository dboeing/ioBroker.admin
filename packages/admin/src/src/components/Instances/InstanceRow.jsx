import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';
import parser from 'cron-parser';
import cronstrue from 'cronstrue';

import 'cronstrue/locales/en';
import 'cronstrue/locales/de';
import 'cronstrue/locales/es';
import 'cronstrue/locales/fr';
import 'cronstrue/locales/it';
import 'cronstrue/locales/nl';
import 'cronstrue/locales/pl';
import 'cronstrue/locales/pt_BR';
import 'cronstrue/locales/ru';
import 'cronstrue/locales/uk';
import 'cronstrue/locales/zh_CN';

import {
    Accordion, AccordionDetails, AccordionSummary, Avatar,
    Button, CardMedia, FormControl, Grid, Hidden, IconButton,
    InputLabel, MenuItem, Select, Tooltip, Typography,
    FormControlLabel, Checkbox, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
    amber, blue, green, grey, red, orange,
} from '@mui/material/colors';

import {
    Refresh as RefreshIcon,
    Build as BuildIcon,
    Input as InputIcon,
    Delete as DeleteIcon,
    LowPriority as LowPriorityIcon,
    Storage as HostIcon,
    Memory as MemoryIcon,
    Schedule as ScheduleIcon,
    ViewCompact as ViewCompactIcon,
    ExpandMore as ExpandMoreIcon,
    Edit as EditIcon,
    ImportExport as ImportExportIcon,
    Pause as PauseIcon,
    PlayArrow as PlayArrowIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

import {
    Utils,
    I18n,
    Confirm as ConfirmDialog,
    TextWithIcon,
    SelectWithIcon,
    ComplexCronDialog as ComplexCron,
} from '@iobroker/adapter-react-v5';

import noSentry from '../../assets/sentryNo.svg';
import sentry from '../../assets/sentry.svg';

import InstanceInfo from './InstanceInfo';
import State from '../State';
import CustomModal from '../CustomModal';
import LinksDialog from './LinksDialog';
import IsVisible from '../IsVisible';

const boxShadow = '0 2px 2px 0 rgba(0, 0, 0, .14),0 3px 1px -2px rgba(0, 0, 0, .12),0 1px 5px 0 rgba(0, 0, 0, .2)';
const boxShadowHover = '0 8px 17px 0 rgba(0, 0, 0, .2),0 6px 20px 0 rgba(0, 0, 0, .19)';

const styles = theme => ({
    root: {
        position: 'relative',
        margin: 10,
        width: 300,
        minHeight: 200,
        background: theme.palette.background.default,
        boxShadow,
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.5s',
        '&:hover': {
            boxShadow: boxShadowHover,
        },
    },
    row: {
        paddingLeft: 8,
        paddingRight: 16,
        padding: 0,
    },
    imageBlock: {
        background: 'silver',
        minHeight: 60,
        display: 'flex',
        padding: '0 10px 0 10px',
        position: 'relative',
        justifyContent: 'space-between',
        transition: 'background 0.5s',
    },
    img: {
        width: 45,
        height: 45,
        margin: 'auto 0',
        position: 'relative',
        '&:after': {
            content: '""',
            position: 'absolute',
            zIndex: 2,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'url("img/no-image.png") 100% 100% no-repeat',
            backgroundSize: 'cover',
            backgroundColor: '#fff',
        },
    },
    installed: {
        background: '#77c7ff8c',
    },
    update: {
        background: '#10ff006b',
    },
    fab: {
        position: 'absolute',
        bottom: -20,
        width: 40,
        height: 40,
        right: 20,
    },
    greenText: {
        color: theme.palette.success.dark,
    },

    collapse: {
        height: '100%',
        backgroundColor: 'silver',
        position: 'absolute',
        width: '100%',
        zIndex: 3,
        marginTop: 'auto',
        bottom: 0,
        transition: 'height 0.3s',
        justifyContent: 'space-between',
        display: 'flex',
        flexDirection: 'column',
    },
    collapseOff: {
        height: 0,
    },
    close: {
        width: '20px',
        height: '20px',
        opacity: '0.9',
        cursor: 'pointer',
        position: 'relative',
        marginLeft: 'auto',
        marginBottom: 10,
        transition: 'all 0.6s ease',
        '&:hover': {
            transform: 'rotate(90deg)',
        },
        '&:before': {
            position: 'absolute',
            left: '9px',
            content: '""',
            height: '20px',
            width: '3px',
            backgroundColor: '#ff4f4f',
            transform: 'rotate(45deg)',
        },
        '&:after': {
            position: 'absolute',
            left: '9px',
            content: '""',
            height: '20px',
            width: '3px',
            backgroundColor: '#ff4f4f',
            transform: 'rotate(-45deg)',
        },
    },
    footerBlock: {
        background: theme.palette.background.default,
        padding: 10,
        display: 'flex',
        justifyContent: 'space-between',
    },
    hidden: {
        display: 'none',
    },
    invisible: {
        opacity: 0,
    },
    buttonUpdate: {
        border: '1px solid',
        padding: '0px 7px',
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background 0.5s',
        '&:hover': {
            background: '#00800026',
        },
    },
    versionDate: {
        alignSelf: 'center',
    },
    adapter: {
        width: '100%',
        fontWeight: 'bold',
        fontSize: 16,
        verticalAlign: 'middle',
        paddingLeft: 8,
        paddingTop: 16,
        color: theme.palette.mode === 'dark' ? '#333' : '#555',
    },
    hide: {
        visibility: 'hidden',
    },
    button: {
        padding: 5,
        transition: 'opacity 0.2s',
        height: 34,
    },
    hiddenOpacity: {
        opacity: 0,
        cursor: 'default',
    },
    enabled: {
        color: green[400],
        '&:hover': {
            backgroundColor: green[200],
        },
    },
    disabled: {
        color: red[400],
        '&:hover': {
            backgroundColor: red[200],
        },
    },
    instanceName: {
        fontSize: 16,
        paddingLeft: 32,
        paddingBottom: 5,
        fontWeight: 'bold',
    },
    cardContent: {
        marginTop: 16,
        paddingTop: 0,
    },
    smallAvatar: {
        width: 24,
        height: 24,
    },
    statusIndicator: {
        marginTop: 12,
    },
    statusIcon_green: { // square
        border: '2px solid grey',
        borderRadius: 2,
    },
    statusIcon_red: { // circle
        border: '2px solid grey',
        borderRadius: 20,
    },
    statusIcon_orange: { // triangle
        border: 0,
        borderRadius: 0,
    },
    statusIcon_orangeDevice: { // triangle
        border: 0,
        borderRadius: 0,
    },
    statusIcon_blue: { // watch
        border: '2px solid grey',
        borderRadius: 20,
    },
    statusIcon_gray: { // circle ?
        border: '2px solid grey',
        borderRadius: 20,
    },
    statusIcon_grey: { // circle ?
        border: '2px solid grey',
        borderRadius: 20,
    },
    instanceIcon: {
        height: 42,
        width: 42,
    },
    table: {
        minWidth: 650,
    },
    tableRow: {
        '&:nth-of-type(odd)': {
            backgroundColor: grey[300],
        },
        '&:nth-of-type(even)': {
            backgroundColor: grey[200],
        },
    },
    state: {
        width: theme.spacing(2),
        height: theme.spacing(2),
        borderRadius: '100%',
    },

    green: {
        // backgroundColor: green[700]
        color: green[700],
    },
    red: {
        // backgroundColor: red[700]
        color: red[700],
    },
    grey: {
        // backgroundColor: grey[700]
        color: grey[700],
    },
    blue: {
        // backgroundColor: blue[700]
        color: '#0055a9', // blue[700]
    },
    orange: {
        // backgroundColor: orange[700]
        color: orange[400],
    },
    orangeDevice: {
        // backgroundColor: orange[700]
        color: orange[300],
    },
    transparent: {
        color: 'transparent',
        backgroundColor: 'transparent',
    },
    paper: {
        height: '100%',
    },
    iframe: {
        height: '100%',
        width: '100%',
        border: 0,
    },
    silly: {

    },
    debug: {
        backgroundColor: grey[700],
    },
    info: {
        backgroundColor: blue[700],
    },
    warn: {
        backgroundColor: amber[700],
    },
    error: {
        backgroundColor: red[700],
    },
    grow: {
        flexGrow: 1,
    },
    tableRender: {
        tableLayout: 'fixed',
        minWidth: 960,
        '& td': {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
    },
    cards: {
        display: 'flex',
        flexFlow: 'wrap',
        justifyContent: 'center',
    },
    sentry: {
        width: 24,
        height: 24,
        objectFit: 'fill',
        filter: 'invert(0%) sepia(90%) saturate(1267%) hue-rotate(-260deg) brightness(99%) contrast(97%)',
    },
    hidden1250: {
        display: 'flex',
        width: 200,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    visible1250: {
        display: 'flex',
        width: 200,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    visible1050: {
        display: 'none',
    },
    hidden1050: {
        display: 'flex',
    },
    hidden800: {
        display: 'flex',
    },
    visible800: {
        display: 'none',
    },
    hidden570: {
        display: 'flex',
    },
    visible570: {
        display: 'none',
    },
    '@media screen and (max-width: 1500px)': {
        hidden1250: {
            display: 'none !important',
        },
        visible1250: {
            display: 'flex !important',
        },
    },
    '@media screen and (max-width: 1300px)': {
        hidden1230: {
            display: 'none !important',
        },
    },
    '@media screen and (max-width: 1120px)': {
        hidden1050: {
            display: 'none !important',
        },
        visible1050: {
            display: 'flex !important',
        },
    },
    '@media screen and (max-width: 800px)': {
        hidden800: {
            display: 'none !important',
        },
        visible800: {
            display: 'flex !important',
        },
        instanceIcon: {
            height: 28,
            width: 28,
            marginLeft: 4,
            marginTop: 8,
        },
    },
    hidden380: {
        display: 'flex',
    },
    '@media screen and (max-width: 650px)': {
        hidden570: {
            display: 'none !important',
        },
        visible570: {
            display: 'flex !important',
        },
    },
    '@media screen and (max-width: 380px)': {
        hidden380: {
            display: 'none !important',
        },
        instanceId: {
            width: '70px !important',
            minWidth: '70px !important',
        },
    },
    '@media screen and (max-width: 480px)': {
        gridStyle: {
            minWidth: 'auto !important',
            marginLeft: 10,
        },
        instanceId: {
            width: 100,
        },
        maxWidth300: {
            width: '250px !important',
        },
    },
    '@media screen and (max-width: 335px)': {
        gridStyle: {
            marginLeft: 0,
        },
    },
    displayFlex: {
        display: 'flex',
    },
    secondaryHeading: {
        maxWidth: 200,
        fontSize: 12,
    },
    secondaryHeadingDiv: {
        display: 'flex',
        alignItems: 'center',
        width: 200,
    },
    secondaryHeadingDivDiv: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        padding: 5,
        textOverflow: 'ellipsis',
        maxWidth: 200,
    },
    /* summaryText: {
        display: 'flex',
        minWidth: 200,
        justifyContent: 'space-around'
    },
    summaryInstanceId: {
        minWidth: 100,
        marginLeft: 5,
        alignSelf: 'center'
    }, */
    formControl: {
        width: '100%',
        marginBottom: 5,
    },
    formControl2: {
        marginBottom: 5,
        marginTop: 5,
        width: '100%',
    },
    gridStyle: {
        display: 'flex',
        minWidth: 270,
        lineHeight: '34px',
        justifyContent: 'space-around',
    },
    wrapperAvatar: {
        maxWidth: 130,
    },
    instanceId: {
        overflow: 'hidden',
        alignSelf: 'center',
        fontSize: 16,
        marginLeft: 5,
        maxWidth: 150,
        minWidth: 100,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        flexGrow: 2,
    },
    marginLeft: {
        marginLeft: 5,
    },
    marginRight: {
        marginRight: 5,
    },
    selectStyle: {
        display: 'flex',
        margin: 5,
        justifyContent: 'space-around',
    },
    selectWrapper: {
        display: 'flex',
        alignItems: 'flex-end',
    },
    scheduleIcon: {
        color: '#dc8e00',
    },
    ram: {
        color: '#dc8e00',
    },
    contrast0: {
        filter: 'contrast(0%)',
    },
    paddingRight200: {
        // paddingRight: 200
    },
    instanceStateNotEnabled1: {
        backgroundColor: 'rgba(192, 192, 192, 0.2)',
    },
    instanceStateNotEnabled2: {
        backgroundColor: 'rgba(192, 192, 192, 0.15)',
    },
    instanceStateNotAlive1: {
        backgroundColor: 'rgba(255,14,14,0.2)',
    },
    instanceStateNotAlive2: {
        backgroundColor: 'rgba(255,14,14, 0.15)',
    },
    instanceStateAliveNotConnected1: {
        backgroundColor: 'rgba(255, 177, 0, 0.1)',
    },
    instanceStateAliveNotConnected2: {
        backgroundColor: 'rgba(255, 177, 0, 0.15)',
    },
    instanceStateAliveAndConnected1: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
    },
    instanceStateAliveAndConnected2: {
        backgroundColor: 'rgba(0, 255, 0, 0.15)',
    },
    maxWidth300: {
        width: 300,
    },
    width150: {
        width: 150,
    },
    deleting: {
        position: 'relative',
        '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            opacity: '.3 !important',
            background: 'repeating-linear-gradient(135deg, #333, #333 10px, #888 10px, #888 20px)',
        },
    },
    desktopRow: {
        minHeight: 0,
    },
    desktopIcon: {
        height: 32,
        width: 32,
        marginTop: 8,
    },
    desktopRowContent: {
        marginTop: 2,
        marginBottom: 2,
    },
    desktopButton: {
        paddingRight: 12,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
    },
    rowGridLine: {
        marginTop: -2,
    },
    tooltip: {
        pointerEvents: 'none',
    },
});

const arrayLogLevel = ['silly', 'debug', 'info', 'warn', 'error'];
const arrayTier = [{ value: 1, desc: '1: Logic adapters' }, { value: 2, desc: '2: Data provider adapters' }, { value: 3, desc: '3: Other adapters' }];

const InstanceRow = ({
    adminInstance,
    classes,
    maxCompactGroupNumber,
    onDeleteInstance,
    deleteCustomSupported,
    expanded,
    expertMode,
    extendObject,
    getInstanceStatus,
    getMemory,
    getModeIcon,
    getRestartSchedule,
    getSchedule,
    onExpandRow,
    hosts,
    id,
    idx,
    instance,
    key,
    lang,
    openConfig,
    setCompact,
    setCompactGroup,
    setHost,
    setLogLevel,
    setMemoryLimitMB,
    setName,
    setRestartSchedule,
    setSchedule,
    setSentry,
    setTier,
    t,
    themeType,
    deleting,
    item,
    socket,
}) => {
    const [openSelectCompactGroup, setOpenSelectCompactGroup] = useState(false);
    const [openDialogCron, setOpenDialogCron] = useState(false);
    const [openDialogSchedule, setOpenDialogSchedule] = useState(false);
    const [openDialogText, setOpenDialogText] = useState(false);
    const [openDialogLogLevel, setOpenDialogLogLevel] = useState(false);
    const [openDialogDelete, setOpenDialogDelete] = useState(false);
    const [openDialogMemoryLimit, setOpenDialogMemoryLimit] = useState(false);
    const [openDialogHost, setOpenDialogHost] = useState(false);
    const [openDialogCompact, setOpenDialogCompact] = useState(false);
    const [openDialogTier, setOpenDialogTier] = useState(false);

    const [showStopAdminDialog, setShowStopAdminDialog] = useState(false);
    const [showLinks, setShowLinks] = useState(false);

    const [logLevelValue, setLogLevelValue] = useState(item.logLevel);
    const [logOnTheFlyValue, setLogOnTheFlyValue] = useState(false);
    const [compactValue, setCompactValue] = useState(item.compactGroup || 0);
    const [maxCompactGroupNumberValue, setCompactGroupCountValue] = useState(maxCompactGroupNumber);
    const [tierValue, setTierValue] = useState(item.tier);
    const [hostValue, setHostValue] = useState(instance.host);
    const [deleteCustomValue, setDeleteCustom] = useState(false);

    const [visibleEdit, handlerEdit] = useState(false);
    const desktop = window.innerWidth > 1000;

    let customModal;
    if (openDialogDelete) {
        customModal = <Dialog
            onClose={() => setOpenDialogDelete(false)}
            open={!0}
        >
            <DialogTitle>{t('Please confirm')}</DialogTitle>
            <DialogContent>
                {openDialogDelete === 1 ?
                    t('Are you sure you want to delete the instance "%s" or whole adapter "%s"?', instance.id, instance.id.split('.')[0]) :
                    t('Are you sure you want to delete the instance %s?', instance.id)}
                {deleteCustomSupported && instance.obj.common.supportCustoms && <br />}
                {deleteCustomSupported && instance.obj.common.supportCustoms && <FormControlLabel
                    control={<Checkbox checked={deleteCustomValue} onChange={e => setDeleteCustom(e.target.checked)} />}
                    label={t('Delete all custom object settings of this adapter too')}
                />}
            </DialogContent>
            <DialogActions>
                <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                        setOpenDialogDelete(false);
                        onDeleteInstance(instance, deleteCustomValue, true);
                        setDeleteCustom(false);
                    }}
                    variant="contained"
                    style={{ background: 'red', color: 'white' }}
                >
                    {I18n.t('Delete adapter')}
                </Button>
                <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                        setOpenDialogDelete(false);
                        onDeleteInstance(instance, deleteCustomValue);
                        setDeleteCustom(false);
                    }}
                    variant="contained"
                    color="primary"
                >
                    {I18n.t('Delete instance')}
                </Button>
                <Button
                    color="grey"
                    onClick={() => setOpenDialogDelete(false)}
                    variant="contained"
                    startIcon={<CloseIcon />}
                >
                    {I18n.t('Cancel')}
                </Button>
            </DialogActions>
        </Dialog>;
    } else {
        let showModal = false;
        let title;
        let help = '';
        if (openDialogText) {
            title = t('Enter title for %s', instance.id);
            showModal = true;
        } else if (openDialogLogLevel) {
            title = t('Edit log level rule for %s', instance.id);
            showModal = true;
        } else if (openDialogMemoryLimit) {
            title = t('Edit memory limit rule for %s', instance.id);
            help = t('Default V8 has a memory limit of 512mb on 32-bit systems, and 1gb on 64-bit systems. The limit can be raised by setting --max-old-space-size to a maximum of ~1gb (32-bit) and ~1.7gb (64-bit)');
            showModal = true;
        } else if (openDialogHost) {
            title = t('Edit host for %s', instance.id);
            showModal = true;
        } else if (openDialogCompact) {
            title = t('Edit compact groups for %s', instance.id);
            showModal = true;
        } else if (openDialogTier) {
            title = t('Set tier for %s', instance.id);
            help = t('Tiers define the order of adapters when the system starts.');
            showModal = true;
        }

        customModal = showModal ? <CustomModal
            title={title}
            help={help}
            open={!0}
            applyDisabled={openDialogText || openDialogMemoryLimit}
            textInput={openDialogText || openDialogMemoryLimit}
            defaultValue={openDialogText ? item.name : openDialogMemoryLimit ? item.memoryLimitMB : ''}
            onApply={value => {
                if (openDialogLogLevel) {
                    setLogLevel(instance, logLevelValue, logOnTheFlyValue);
                    setOpenDialogLogLevel(false);
                } else if (openDialogText) {
                    setName(instance, value);
                    setOpenDialogText(false);
                } else if (openDialogMemoryLimit) {
                    setMemoryLimitMB(instance, value);
                    setOpenDialogMemoryLimit(false);
                } else if (openDialogCompact) {
                    setCompactGroup(instance, compactValue);
                    setOpenDialogCompact(false);
                } else if (openDialogTier) {
                    setTier(instance, tierValue);
                    setOpenDialogTier(false);
                } else if (openDialogHost) {
                    setHost(instance, hostValue);
                    setOpenDialogHost(false);
                }
            }}
            onClose={() => {
                if (openDialogLogLevel) {
                    setLogLevelValue(item.logLevel);
                    setLogOnTheFlyValue(false);
                    setOpenDialogLogLevel(false);
                } else if (openDialogText) {
                    setOpenDialogText(false);
                } else if (openDialogMemoryLimit) {
                    setOpenDialogMemoryLimit(false);
                } else if (openDialogCompact) {
                    setCompactValue(item.compactGroup);
                    setCompactGroupCountValue(maxCompactGroupNumber);
                    setOpenDialogCompact(false);
                } else if (openDialogTier) {
                    setTierValue(item.tier);
                    setOpenDialogTier(false);
                } else if (openDialogHost) {
                    setHostValue(instance.host);
                    setOpenDialogHost(false);
                }
            }}
        >
            {openDialogLogLevel && <FormControl className={classes.formControl} variant="outlined">
                <InputLabel>{t('log level')}</InputLabel>
                <Select
                    variant="standard"
                    value={logLevelValue}
                    fullWidth
                    onChange={el => setLogLevelValue(el.target.value)}
                >
                    {arrayLogLevel.map(el => <MenuItem key={el} value={el}>
                        {t(el)}
                    </MenuItem>)}
                </Select>
            </FormControl>}
            {openDialogLogLevel && <FormControl className={classes.formControl} variant="outlined">
                <FormControlLabel
                    control={<Checkbox
                        checked={logOnTheFlyValue}
                        onChange={e => setLogOnTheFlyValue(e.target.checked)}
                    />}
                    label={t('Without restart')}
                />
                <FormHelperText>{logOnTheFlyValue ? t('Will be reset to the saved log level after restart of adapter') : t('Log level will be saved permanently')}</FormHelperText>
            </FormControl>}
            {openDialogCompact && <FormControl className={classes.formControl2} variant="outlined">
                <InputLabel>{t('compact groups')}</InputLabel>
                <Select
                    variant="standard"
                    autoWidth
                    onClose={() => setOpenSelectCompactGroup(false)}
                    onOpen={() => setOpenSelectCompactGroup(true)}
                    open={openSelectCompactGroup}
                    value={compactValue === 1 ? 'default' : compactValue === '0' || compactValue === 0 ? 'controller' : !compactValue ? 'default' : compactValue || 'default'}
                    onChange={el => setCompactValue(el.target.value)}
                >
                    <div
                        onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        className={classes.selectStyle}
                    >
                        <Button
                            color="grey"
                            onClick={() => {
                                setOpenSelectCompactGroup(false);
                                setCompactValue(maxCompactGroupNumberValue + 1);
                                setCompactGroupCountValue(maxCompactGroupNumberValue + 1);
                            }}
                            variant="outlined"
                            stylevariable="outlined"
                        >
                            {t('Add compact group')}
                        </Button>
                    </div>
                    <MenuItem value="controller">{t('with controller')}</MenuItem>
                    <MenuItem value="default">{t('default group')}</MenuItem>
                    {Array(maxCompactGroupNumberValue - 1).fill().map((_, idxx) =>
                        <MenuItem key={idxx} value={idxx + 2}>
                            {idxx + 2}
                        </MenuItem>)}
                </Select>
            </FormControl>}
            {openDialogTier && <FormControl className={classes.formControl} variant="outlined">
                <InputLabel>{t('Tiers')}</InputLabel>
                <Select
                    variant="standard"
                    value={tierValue}
                    fullWidth
                    onChange={el => setTierValue(el.target.value)}
                >
                    {arrayTier.map(el => <MenuItem key={el.value} value={el.value}>
                        {t(el.desc)}
                    </MenuItem>)}
                </Select>
            </FormControl>}
            {openDialogHost && <SelectWithIcon
                themeType={themeType}
                value={hostValue}
                list={hosts}
                removePrefix="system.host."
                fullWidth
                className={classes.formControl}
                onChange={el => setHostValue(el)}
            />}
        </CustomModal> : null;
    }

    const status = getInstanceStatus(id);

    const linksDialog = showLinks ? <LinksDialog
        image={instance.image}
        instanceId={instance.id}
        links={instance.links}
        onClose={() => setShowLinks(false)}
        t={t}
        themeType={themeType}
    /> : null;

    const stopAdminDialog = showStopAdminDialog ? <ConfirmDialog
        title={t('Please confirm')}
        text={t('stop_admin', adminInstance)}
        ok={t('Stop admin')}
        onClose={result => {
            if (result) {
                extendObject(showStopAdminDialog, { common: { enabled: false } });
            }
            setShowStopAdminDialog(false);
        }}
    /> : null;

    let next;
    let prev;
    let cronText;
    if (instance.mode === 'schedule' && instance.schedule) {
        try {
            cronText = cronstrue.toString(instance.schedule, { locale: lang });
        } catch (e) {
            cronText = instance.schedule;
        }

        if (instance.enabled) {
            try {
                next = new Date(parser.parseExpression(instance.schedule).next());
                prev = new Date(parser.parseExpression(instance.schedule).prev());
            } catch (e) {
                next = null;
                prev = null;
            }
        }
    }

    const stateTooltip = [
        item.stoppedWhenWebExtension !== undefined ? <State key={1} state>{t('Runs as web-extension')}</State> : '',
        instance.mode === 'daemon' && item.stoppedWhenWebExtension === undefined ? <State key={2} state={item.connectedToHost}>{t('Connected to host')}</State> : '',
        instance.mode === 'daemon' && item.stoppedWhenWebExtension === undefined ? <State key={3} state={item.alive}>{t('Heartbeat')}</State> : '',
        item.connected !== null && item.stoppedWhenWebExtension === undefined ? <State key={4} state={!!item.connected}>
            {typeof item.connected === 'string' ? `${t('Connected:')} ${item.connected || '-'}` : t('Connected to device or service')}
        </State> : '',
        cronText ? <State key={5} state={instance.enabled}>
CRON:
            {cronText}
        </State> : null,
        next ? <State key={6} state>{t('Next start: %s', `${next.toLocaleDateString(lang)} ${next.toLocaleTimeString(lang)}`)}</State> : null,
        prev ? <State key={7} state>{t('Last start: %s', `${prev.toLocaleDateString(lang)} ${prev.toLocaleTimeString(lang)}`)}</State> : null,
    ].filter(el => el);

    const modeIcon = <div
        className={Utils.clsx(
            classes.smallAvatar,
            classes.statusIndicator,
            instance.mode === 'daemon' || instance.mode === 'schedule' ? classes[status] : classes.transparent,
            item.connectedToHost && item.alive && item.connected === false && classes.orangeDevice,
        )}
    >
        {getModeIcon(instance.mode, status, classes[`statusIcon_${status}`], item.stoppedWhenWebExtension)}
    </div>;

    return <Accordion
        key={key}
        square
        classes={{ root: deleting ? classes.deleting : '' }}
        expanded={expanded === instance.id && !deleting}
        onChange={() => {
            if (openDialogCron ||
                openDialogSchedule ||
                openDialogLogLevel ||
                openDialogText ||
                openDialogDelete ||
                openDialogMemoryLimit ||
                openDialogCompact ||
                openDialogTier ||
                openDialogHost) {
                return;
            }
            onExpandRow(instance.id);
        }}
    >
        {linksDialog}
        <AccordionSummary
            classes={{
                root: classes.row,
                content:  desktop ? classes.desktopRowContent : undefined,
                expandIcon: desktop ? classes.desktopButton : undefined,
            }}
            className={Utils.clsx(
                (!item.running || instance.mode !== 'daemon' || item.stoppedWhenWebExtension !== undefined) && (idx % 2 === 0 ? classes.instanceStateNotEnabled1 : classes.instanceStateNotEnabled2),
                item.running && instance.mode === 'daemon' && item.stoppedWhenWebExtension === undefined && (!item.connectedToHost || !item.alive) && (idx % 2 === 0 ? classes.instanceStateNotAlive1 : classes.instanceStateNotAlive2),
                item.running && item.connectedToHost && item.alive && item.connected === false && (idx % 2 === 0 ? classes.instanceStateAliveNotConnected1 : classes.instanceStateAliveNotConnected2),
                item.running && item.connectedToHost && item.alive && item.connected !== false && (idx % 2 === 0 ? classes.instanceStateAliveAndConnected1 : classes.instanceStateAliveAndConnected1),
                desktop && classes.desktopRow,
            )}
            expandIcon={<ExpandMoreIcon />}
        >
            {customModal}
            {stopAdminDialog}
            {(openDialogCron || openDialogSchedule) && <ComplexCron
                title={
                    (openDialogCron && t('Edit restart rule for %s', instance.id)) ||
                    (openDialogSchedule && t('Edit schedule rule for %s', instance.id))
                }
                clearButton
                cron={openDialogCron ? getRestartSchedule(id) : getSchedule(id)}
                language={I18n.getLanguage()}
                onOk={cron => {
                    if (openDialogCron) {
                        setRestartSchedule(instance, cron);
                    } else if (openDialogSchedule) {
                        setSchedule(instance, cron);
                    }
                }}
                onClose={() => {
                    if (openDialogCron) {
                        setOpenDialogCron(false);
                    } else if (openDialogSchedule) {
                        setOpenDialogSchedule(false);
                    }
                }}
            />}
            <Grid container spacing={1} alignItems="center" direction="row" wrap="nowrap" className={classes.rowGridLine}>
                <div className={classes.gridStyle}>
                    {stateTooltip.length ?
                        <Tooltip
                            classes={{ popper: classes.tooltip }}
                            title={<span
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {stateTooltip}
                            </span>}
                        >
                            {modeIcon}
                        </Tooltip>
                        : modeIcon}
                    <Avatar
                        variant="square"
                        alt={instance.id}
                        src={instance.image}
                        className={Utils.clsx(classes.instanceIcon, desktop && classes.desktopIcon)}
                    />
                    <div className={classes.instanceId}>{instance.id}</div>
                </div>
                <Tooltip title={t('Start/stop')} classes={{ popper: classes.tooltip }}>
                    <div>
                        <IconButton
                            size="small"
                            onClick={event => {
                                event.stopPropagation();
                                event.preventDefault();
                                if (item.running && instance.id === adminInstance) {
                                    setShowStopAdminDialog(`system.adapter.${instance.id}`);
                                } else {
                                    extendObject(`system.adapter.${instance.id}`, { common: { enabled: !item.running } });
                                }
                            }}
                            onFocus={event => event.stopPropagation()}
                            className={Utils.clsx(classes.button, instance.canStart ?
                                (item.running ? classes.enabled : classes.disabled) : classes.hide)}
                        >
                            {item.running ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                    </div>
                </Tooltip>
                <IsVisible config={item} name="allowInstanceSettings">
                    <Hidden xsDown>
                        <div>
                            <Tooltip title={instance.config ? t('Settings') : ''} classes={{ popper: classes.tooltip }}>
                                <div>
                                    <IconButton
                                        disabled={!instance.config}
                                        size="small"
                                        className={Utils.clsx(classes.button, !instance.config && classes.hiddenOpacity)}
                                        onClick={event => {
                                            event.stopPropagation();
                                            openConfig(id);
                                        }}
                                    >
                                        <BuildIcon />
                                    </IconButton>
                                </div>
                            </Tooltip>
                        </div>
                    </Hidden>
                </IsVisible>
                <Tooltip title={t('Restart')} classes={{ popper: classes.tooltip }}>
                    <div>
                        <IconButton
                            size="small"
                            onClick={event => {
                                event.stopPropagation();
                                extendObject(`system.adapter.${instance.id}`, {});
                            }}
                            onFocus={event => event.stopPropagation()}
                            className={Utils.clsx(classes.button, !instance.canStart && classes.hide)}
                            disabled={!item.running}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </div>
                </Tooltip>
                <IsVisible config={item} name="allowInstanceLink">
                    <Tooltip title={t('Instance link %s', instance.id)} classes={{ popper: classes.tooltip }}>
                        <div>
                            <IconButton
                                size="small"
                                className={Utils.clsx(classes.button, (!instance.links || !instance.links[0]) && classes.hide)}
                                disabled={!item.running}
                                onClick={event => {
                                    event.stopPropagation();
                                    if (instance.links.length === 1) {
                                        // replace IPv6 Address with [ipv6]:port
                                        let url = instance.links[0].link;
                                        url = url.replace(/\/\/([0-9a-f]*:[0-9a-f]*:[0-9a-f]*:[0-9a-f]*:[0-9a-f]*:[0-9a-f]*)(:\d+)?\//i, '//[$1]$2/');
                                        window.open(url, instance.id);
                                    } else {
                                        setShowLinks(true);
                                    }
                                }}
                                onFocus={event => event.stopPropagation()}
                            >
                                <InputIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                </IsVisible>

                <Typography className={Utils.clsx(classes.secondaryHeading, classes.hidden800)} component="div">
                    <div
                        onMouseMove={() => handlerEdit(true)}
                        onMouseEnter={() => handlerEdit(true)}
                        onMouseLeave={() => handlerEdit(false)}
                        className={classes.secondaryHeadingDiv}
                    >
                        <div className={classes.secondaryHeadingDivDiv}>{item.name}</div>
                        <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                            <IconButton
                                size="small"
                                className={Utils.clsx(classes.button, !visibleEdit && classes.hiddenOpacity)}
                                onClick={event => {
                                    event.stopPropagation();
                                    setOpenDialogText(true);
                                }}
                            >
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                    </div>
                </Typography>
                {expertMode &&
                    <div className={Utils.clsx(classes.hidden1250, (instance.mode !== 'daemon' || !item.running) && classes.invisible)}>
                        <InstanceInfo
                            icon={<ImportExportIcon />}
                            tooltip={t('events')}
                        >
                            <div className={classes.displayFlex}>
                                <Tooltip title={t('input events')} classes={{ popper: classes.tooltip }}>
                                    <div className={classes.marginRight}>
⇥
                                        {item.inputOutput.stateInput}
                                    </div>
                                </Tooltip>
                                    /
                                <Tooltip title={t('output events')} classes={{ popper: classes.tooltip }}>
                                    <div className={classes.marginLeft}>
↦
                                        {item.inputOutput.stateOutput}
                                    </div>
                                </Tooltip>
                            </div>
                        </InstanceInfo>
                    </div>}
                {expertMode &&
                    <Tooltip title={item.logLevelObject === item.logLevel ? `${t('loglevel')} ${item.logLevel}` : `${t('saved:')} ${item.logLevelObject} / ${t('actual:')} ${item.logLevel}`} classes={{ popper: classes.tooltip }}>
                        <Avatar className={Utils.clsx(classes.smallAvatar, classes.hidden380, classes[item.logLevel])}>
                            {item.loglevelIcon}
                        </Avatar>
                    </Tooltip>}
                <Grid item className={Utils.clsx(classes.hidden1050, classes.width150, (instance.mode !== 'daemon' || !item.running) && classes.invisible)}>
                    <InstanceInfo
                        icon={<MemoryIcon />}
                        tooltip={t('RAM usage')}
                    >
                        {`${instance.mode === 'daemon' && item.running ? getMemory(id) : '-.--'} MB`}
                    </InstanceInfo>
                </Grid>
                {hosts.length > 1 || (hosts.length && hosts[0].common?.name !== instance.host) ? <Grid item className={Utils.clsx(classes.hidden1230)}>
                    <TextWithIcon value={instance.host} list={hosts} removePrefix="system.host." themeType={themeType} t={t} lang={lang} />
                </Grid> : null}
            </Grid>
            <div className={classes.hidden570}>
                <Tooltip title="sentry" classes={{ popper: classes.tooltip }}>
                    <IconButton
                        size="small"
                        className={Utils.clsx(classes.button, expertMode && item.checkSentry ? null : classes.hide)}
                        onClick={e => {
                            e.stopPropagation();
                            setSentry(instance);
                        }}
                    >
                        <CardMedia
                            className={Utils.clsx(classes.sentry, !item.sentry && classes.contrast0)}
                            component="img"
                            image={item.sentry ? sentry : noSentry}
                        />
                    </IconButton>
                </Tooltip>
            </div>
            <div className={classes.hidden570}>
                <Tooltip title={t('compact groups')} classes={{ popper: classes.tooltip }}>
                    <IconButton
                        size="small"
                        className={Utils.clsx(classes.button, expertMode && item.checkCompact ? null : classes.hide)}
                        onClick={e => {
                            e.stopPropagation();
                            setCompact(instance);
                        }}
                    >
                        <ViewCompactIcon color={item.compact ? 'primary' : 'inherit'} />
                    </IconButton>
                </Tooltip>
            </div>
        </AccordionSummary>
        <AccordionDetails>
            <Grid container direction="row">
                <Grid item container direction="row" xs={10}>
                    <Grid item container direction="column" xs={12} sm={6} md={4}>
                        <span className={classes.instanceName}>{instance.id}</span>
                        {item.stoppedWhenWebExtension !== undefined && <State state={item.stoppedWhenWebExtension}>{t('Runs as web-extension')}</State>}
                        {item.running && instance.mode === 'daemon' && item.stoppedWhenWebExtension === undefined && <State state={item.connectedToHost}>{t('Connected to host')}</State>}
                        {item.running && instance.mode === 'daemon' && item.stoppedWhenWebExtension === undefined && <State state={item.alive}>{t('Heartbeat')}</State>}
                        {item.running && item.connected !== null  && item.stoppedWhenWebExtension === undefined &&
                            <State state={!!item.connected}>
                                {typeof item.connected === 'string' ? `${t('Connected:')} ${item.connected || '-'}` : t('Connected to device or service')}
                            </State>}
                    </Grid>
                    <Grid container item direction="column" xs={12} sm={6} md={4}>
                        <InstanceInfo tooltip={t('Installed')}>
                            v
                            {instance.version}
                        </InstanceInfo>
                    </Grid>
                    <Grid container item direction="column" xs={12} sm={6} md={4} className={classes.paddingRight200}>
                        {expertMode && <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                            <InstanceInfo icon={item.loglevelIcon} tooltip={item.logLevelObject === item.logLevel ? `${t('loglevel')} ${item.logLevel}` : `${t('saved:')} ${item.logLevelObject} / ${t('actual:')} ${item.logLevel}`}>
                                {item.logLevelObject === item.logLevel ? item.logLevel : `${item.logLevelObject} / ${item.logLevel}`}
                            </InstanceInfo>
                            <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setOpenDialogLogLevel(true);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        </div>}
                        {item.running && expertMode &&
                            <div className={classes.visible1250}>
                                <InstanceInfo icon={<ImportExportIcon />} tooltip={t('events')}>
                                    <div className={classes.displayFlex}>
                                        <Tooltip title={t('input events')} classes={{ popper: classes.tooltip }}>
                                            <div className={classes.marginRight}>
⇥
                                                {item.inputOutput.stateInput}
                                            </div>
                                        </Tooltip>
                                    /
                                        <Tooltip title={t('output events')} classes={{ popper: classes.tooltip }}>
                                            <div className={classes.marginLeft}>
↦
                                                {item.inputOutput.stateOutput}
                                            </div>
                                        </Tooltip>
                                    </div>
                                </InstanceInfo>
                            </div>}
                        <Grid item className={classes.visible1050}>
                            <InstanceInfo icon={<MemoryIcon />} tooltip={t('RAM usage')}>
                                {`${instance.mode === 'daemon' && item.running ? getMemory(id) : '-.--'} MB`}
                            </InstanceInfo>
                        </Grid>
                        {item.modeSchedule && <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                            <InstanceInfo icon={<ScheduleIcon />} tooltip={t('schedule_group')}>
                                {getSchedule(id) || '-'}
                            </InstanceInfo>
                            <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setOpenDialogSchedule(true);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        </div>}
                        {expertMode && (instance.mode === 'daemon') &&
                            <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                                <InstanceInfo
                                    icon={<ScheduleIcon className={classes.scheduleIcon} />}
                                    tooltip={t('restart')}
                                >
                                    {getRestartSchedule(id) || '-'}
                                </InstanceInfo>
                                <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                    <IconButton
                                        size="small"
                                        className={classes.button}
                                        onClick={event => {
                                            event.stopPropagation();
                                            setOpenDialogCron(true);
                                        }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                            </div>}
                        {expertMode &&
                            <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                                <InstanceInfo
                                    icon={<MemoryIcon className={classes.ram} />}
                                    tooltip={t('RAM limit')}
                                >
                                    {`${item.memoryLimitMB ? item.memoryLimitMB : '-.--'} MB`}
                                </InstanceInfo>
                                <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                    <IconButton
                                        size="small"
                                        className={classes.button}
                                        onClick={e => {
                                            e.stopPropagation();
                                            setOpenDialogMemoryLimit(true);
                                        }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                            </div>}
                        {expertMode && item.checkCompact && item.compact && item.supportCompact &&
                            <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                                <InstanceInfo icon={<ViewCompactIcon className={classes.marginRight} color="inherit" />} tooltip={t('compact groups')}>
                                    {item.compactGroup === 1 ? 'default' : item.compactGroup === '0' ? 'controller' : !item.compactGroup ? 'default' : item.compactGroup || 'default'}
                                </InstanceInfo>
                                <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                    <IconButton
                                        size="small"
                                        className={classes.button}
                                        onClick={e => {
                                            e.stopPropagation();
                                            setOpenDialogCompact(true);
                                        }}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                            </div>}
                        {expertMode && <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                            <InstanceInfo icon={<LowPriorityIcon className={classes.marginRight} color="inherit" />} tooltip={t('Start order (tier)')}>
                                {instance.adapter === 'admin' ? t('Always first') : t(arrayTier.find(el => el.value === item.tier)?.desc || arrayTier[2])}
                            </InstanceInfo>
                            {instance.adapter !== 'admin' ? <Tooltip title={t('Edit start order (tier)')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={e => {
                                        e.stopPropagation();
                                        setOpenDialogTier(true);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip> : null}
                        </div>}
                        <div className={Utils.clsx(classes.maxWidth300, classes.visible800)}>
                            <InstanceInfo>
                                {item.name}
                            </InstanceInfo>
                            <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setOpenDialogText(true);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        </div>
                        {hosts.length > 1 || (hosts.length && hosts[0].common?.name !== instance.host) ? <div className={Utils.clsx(classes.displayFlex, classes.maxWidth300)}>
                            <InstanceInfo icon={<HostIcon className={classes.marginRight} />} tooltip={t('Host for this instance')}>
                                <TextWithIcon value={instance.host} list={hosts} removePrefix="system.host." themeType={themeType} t={t} lang={lang} />
                            </InstanceInfo>
                            <Tooltip title={t('Edit')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setOpenDialogHost(true);
                                    }}
                                >
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                        </div> : null}
                    </Grid>
                </Grid>
                <div className={classes.displayFlex}>
                    <IsVisible config={item} name="allowInstanceDelete">
                        <Hidden smUp>
                            <Tooltip title={t('Settings')} classes={{ popper: classes.tooltip }}>
                                <IconButton
                                    size="small"
                                    className={classes.button}
                                    onClick={event => {
                                        event.stopPropagation();
                                        openConfig(id);
                                    }}
                                >
                                    <BuildIcon />
                                </IconButton>
                            </Tooltip>
                        </Hidden>
                    </IsVisible>
                    <IsVisible config={item} name="allowInstanceDelete">
                        <Tooltip title={t('Delete')} classes={{ popper: classes.tooltip }}>
                            <IconButton
                                size="small"
                                className={classes.button}
                                onClick={async event => {
                                    event.stopPropagation();
                                    // Count the number of instances
                                    const instances = await socket.getAdapterInstances(instance.id.split('.')[0]);
                                    setOpenDialogDelete(instances.length || true);
                                }}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </IsVisible>
                    <div className={classes.visible570}>
                        <Tooltip title="sentry" classes={{ popper: classes.tooltip }}>
                            <IconButton
                                size="small"
                                className={Utils.clsx(classes.button, expertMode && item.checkSentry ? null : classes.hide)}
                                onClick={e => {
                                    e.stopPropagation();
                                    setSentry(instance);
                                }}
                            >
                                <CardMedia
                                    className={Utils.clsx(classes.sentry, !item.sentry && classes.contrast0)}
                                    component="img"
                                    image={sentry}
                                />
                            </IconButton>
                        </Tooltip>
                    </div>
                    <div className={classes.visible570}>
                        <Tooltip title={t('compact groups')} classes={{ popper: classes.tooltip }}>
                            <IconButton
                                size="small"
                                className={Utils.clsx(classes.button, expertMode && item.checkCompact ? null : classes.hide)}
                                onClick={e => {
                                    e.stopPropagation();
                                    setCompact(instance);
                                }}
                            >
                                <ViewCompactIcon color={item.compact ? 'primary' : 'inherit'} />
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            </Grid>
        </AccordionDetails>
    </Accordion>;
};

InstanceRow.propTypes = {
    t: PropTypes.func,
    themeType: PropTypes.string,
    adminInstance: PropTypes.string,
    hosts: PropTypes.array,
    setHost: PropTypes.func,
    instanceId: PropTypes.string,
    deleting: PropTypes.bool,
    onExpandRow: PropTypes.func,
    item: PropTypes.object,
    deleteCustomSupported: PropTypes.bool,
    socket: PropTypes.object,
};

export default withStyles(styles)(InstanceRow);
