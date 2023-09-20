import React, { useState } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import {
    Card, CardContent, CardMedia, Fab,
    IconButton, Tooltip, Typography, Rating,
} from '@mui/material';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import BuildIcon from '@mui/icons-material/RotateRight';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import HelpIcon from '@mui/icons-material/Help';
import PublishIcon from '@mui/icons-material/Publish';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import GitHubIcon from '@mui/icons-material/GitHub';
import { amber } from '@mui/material/colors';

import { Utils } from '@iobroker/adapter-react-v5';

import sentryIcon from '../../assets/sentry.svg';
import IsVisible from '../IsVisible';

const boxShadow = '0 2px 2px 0 rgba(0, 0, 0, .14),0 3px 1px -2px rgba(0, 0, 0, .12),0 1px 5px 0 rgba(0, 0, 0, .2)';
const boxShadowHover = '0 8px 17px 0 rgba(0, 0, 0, .2),0 6px 20px 0 rgba(0, 0, 0, .19)';

function MyImage(props) {
    const {
        src, alt, style, ...other
    } = props;
    const img = props.style.backgroundImage.substring(5, props.style.backgroundImage.length - 2);
    return <img
        src={img}
        alt={alt}
        {...other}
        onError={e => {
            if (this) {
                // eslint-disable-next-line react/no-this-in-sfc
                this.onerror = null;
                // eslint-disable-next-line react/no-this-in-sfc
                this.src = './img/no-image.png';
            } else if (e.target) {
                e.target.onerror = null;
                e.target.src = './img/no-image.png';
            }
        }}
    />;
}

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
    imageBlock: {
        background: theme.palette.mode === 'dark' ? '#848484' : '#c0c0c0',
        minHeight: 60,
        display: 'flex',
        padding: '0 10px 0 10px',
        position: 'relative',
        justifyContent: 'space-between',
        color: '#000',
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
            backgroundColor: 'rgba(0, 0, 0, 0.54)',
            transform: 'rotate(45deg)',
        },
        '&:after': {
            position: 'absolute',
            left: '9px',
            content: '""',
            height: '20px',
            width: '3px',
            backgroundColor: 'rgba(0, 0, 0, 0.54)',
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
        color: theme.palette.mode === 'dark' ? '#333' : '#333',
    },
    adapterWithAgo: {
        width: 'calc(100% - 145px)',
    },
    description: {
        color: theme.palette.mode === 'dark' ? '#222' : 'inherit',
    },

    cardContent: {
        overflow: 'auto',
    },
    cardContentDiv: {
        position: 'sticky',
        right: 0,
        top: 0,
        background: 'silver',
    },
    cardContentFlex: {
        display: 'flex',
    },
    cardContentFlexBetween: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    cardContent2: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    cardMargin10: {
        marginTop: 10,
    },
    availableVersion: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    buttonUpdateIcon: {
        height: 20,
        width: 20,
        marginRight: 10,
    },
    curdContentFlexCenter: {
        display: 'flex',
        alignItems: 'center',
    },

    classPoll: {
        color: 'orange',
    },
    classPush: {
        color: 'green',
    },
    classAssumption: {
        color: 'red',
        transform: 'rotate(90deg)',
    },
    marginLeft5: {
        marginLeft: 5,
    },
    rating: {
        marginTop: 20,
    },
    ratingSet: {
        cursor: 'pointer',
    },
    versionWarn: {
        color: amber[500],
        marginRight: 5,
    },
    sentry: {
        width: 21,
        height: 21,
        objectFit: 'fill',
        marginTop: 3,
        filter: 'invert(0%) sepia(90%) saturate(1267%) hue-rotate(-260deg) brightness(99%) contrast(97%)',
    },
    tooltip: {
        pointerEvents: 'none',
    },
});

const AdapterTile = ({
    name,
    classes,
    image,
    version,
    installedVersion,
    installedCount,
    updateAvailable,
    onUpdate,
    description,
    rightOs,
    onAddInstance,
    onInfo,
    expertMode,
    onUpload,
    onDeletion,
    rebuild,
    onRebuild,
    hidden,
    stat,
    versionDate,
    adapter,
    isCategory,
    connectionType,
    openInstallVersionDialog,
    dataSource,
    t,
    commandRunning,
    rating,
    onSetRating,
    installedFrom,
    sentry,
    allowAdapterInstall,
    allowAdapterReadme,
    allowAdapterDelete,
    allowAdapterUpdate,
    allowAdapterRating,
}) => {
    const [openCollapse, setCollapse] = useState(false);
    const [focused, setFocused] = useState(false);

    return <Card className={Utils.clsx(classes.root, hidden ? classes.hidden : '')}>
        {(openCollapse || focused) && <div className={Utils.clsx(classes.collapse, !openCollapse ? classes.collapseOff : '')}>
            <CardContent className={classes.cardContent}>
                <div className={classes.cardContentDiv}>
                    <div className={classes.close} onClick={() => setCollapse(bool => !bool)} />
                </div>
                <Typography gutterBottom component="span" variant="body2" className={classes.description}>
                    {description}
                </Typography>
            </CardContent>
            <div className={classes.footerBlock}>
                <IsVisible value={allowAdapterInstall}>
                    <Tooltip title={t('Add instance')}>
                        <IconButton
                            size="small"
                            disabled={commandRunning}
                            className={!rightOs ? classes.hidden : ''}
                            onClick={rightOs ? onAddInstance : null}
                        >
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </IsVisible>
                <div className={classes.cardContentFlex}>
                    <IsVisible value={allowAdapterReadme}>
                        <Tooltip title={t('Readme')}>
                            <IconButton
                                size="small"
                                onClick={onInfo}
                            >
                                <HelpIcon />
                            </IconButton>
                        </Tooltip>
                    </IsVisible>
                    {expertMode &&
                        <Tooltip title={t('Upload')}>
                            <IconButton
                                size="small"
                                disabled={commandRunning}
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={onUpload}
                            >
                                <PublishIcon />
                            </IconButton>
                        </Tooltip>}
                    <IsVisible value={allowAdapterDelete}>
                        <Tooltip title={t('Delete adapter')}>
                            <IconButton
                                size="small"
                                disabled={commandRunning}
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={onDeletion}
                            >
                                <DeleteForeverIcon />
                            </IconButton>
                        </Tooltip>
                    </IsVisible>
                    {expertMode && allowAdapterUpdate !== false &&
                        <Tooltip title={t('Install a specific version')}>
                            <IconButton
                                disabled={commandRunning}
                                size="small"
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={openInstallVersionDialog}
                            >
                                <AddToPhotosIcon />
                            </IconButton>
                        </Tooltip>}
                    {rebuild && expertMode &&
                        <Tooltip title={t('Rebuild')}>
                            <IconButton
                                disabled={commandRunning}
                                size="small"
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={onRebuild}
                            >
                                <BuildIcon />
                            </IconButton>
                        </Tooltip>}
                </div>
            </div>
        </div>}
        <div
            className={Utils.clsx(
                classes.imageBlock,
                installedVersion ? classes.installed : '',
                installedVersion && installedVersion !== version && updateAvailable ? classes.update : '',
            )}
        >
            <CardMedia
                className={classes.img}
                component={MyImage}
                src={image || 'img/no-image.png'}
                image={image || 'img/no-image.png'}
            />
            <div className={Utils.clsx(classes.adapter, (stat || versionDate) && classes.adapterWithAgo)}>{adapter}</div>
            <div className={classes.versionDate}>{stat || versionDate}</div>
            {!stat && !versionDate && allowAdapterRating !== false ? <div
                onClick={onSetRating ? () => onSetRating() : undefined}
                className={Utils.clsx(classes.rating, onSetRating && classes.ratingSet)}
                title={rating?.title}
            >
                <Rating
                    name={adapter}
                    precision={0.5}
                    size="small"
                    readOnly
                    value={rating?.rating ? rating.rating.r : 0}
                />
            </div> : null}
            <Tooltip title={t('Info')}>
                <Fab
                    onMouseOut={() => setFocused(false)}
                    onMouseOver={() => setFocused(true)}
                    onClick={() => setCollapse(bool => !bool)}
                    className={classes.fab}
                    color="primary"
                    aria-label="add"
                >
                    <MoreVertIcon />
                </Fab>
            </Tooltip>
        </div>
        <CardContent className={classes.cardContent2}>
            <Typography gutterBottom variant="h5" component="h5">{name}</Typography>
            <div className={classes.cardContentFlex}>
                {!isCategory &&
                    (connectionType === 'cloud' ?
                        <Tooltip title={t('Adapter requires the specific cloud access for these devices/service')}>
                            <CloudIcon />
                        </Tooltip> :
                        connectionType === 'local' ?
                            <Tooltip title={t('Adapter does not use the cloud for these devices/service')}>
                                <CloudOffIcon />
                            </Tooltip> : '')}
                {dataSource && <div className={classes.marginLeft5}>
                    {(dataSource === 'poll' ?
                        <Tooltip title={t('The device or service will be periodically asked')}>
                            <ArrowUpwardIcon className={classes.classPoll} />
                        </Tooltip> :
                        dataSource === 'push' ?
                            <Tooltip title={t('The device or service delivers the new state actively')}>
                                <ArrowDownwardIcon className={classes.classPush} />
                            </Tooltip> :
                            dataSource === 'assumption' ?
                                <Tooltip title={t('Adapter cannot request the exactly device status and the status will be guessed on the last sent command')}>
                                    <RemoveIcon className={classes.classAssumption} />
                                </Tooltip> : null)}
                </div>}
                {sentry && <div className={classes.marginLeft5}>
                    <Tooltip title="sentry">
                        <CardMedia
                            className={classes.sentry}
                            component="img"
                            image={sentryIcon}
                        />
                    </Tooltip>
                </div>}
            </div>
            <div className={classes.cardMargin10}>
                {!!installedCount && <Typography component="span" className={classes.cardContentFlexBetween}>
                    <div>
                        {t('Installed instances')}
                        :
                    </div>
                    <div>{installedCount}</div>
                </Typography>}
                <IsVisible value={allowAdapterUpdate}>
                    <Typography component="span" className={classes.availableVersion}>
                        <div>{t('Available version:')}</div>
                        <div className={Utils.clsx(updateAvailable && classes.greenText, classes.curdContentFlexCenter)}>
                            {!commandRunning && updateAvailable ?

                                <Tooltip title={t('Update')}>
                                    <div onClick={onUpdate} className={classes.buttonUpdate}>
                                        <IconButton
                                            className={classes.buttonUpdateIcon}
                                            size="small"
                                        >
                                            <RefreshIcon />
                                        </IconButton>
                                        {version}
                                    </div>
                                </Tooltip> :
                                version}
                        </div>
                    </Typography>
                </IsVisible>
                {installedVersion && <Typography component="span" className={classes.cardContentFlexBetween}>
                    <div>
                        {t('Installed version')}
                        :
                    </div>
                    <div className={classes.cardContentFlex}>
                        {installedFrom && !installedFrom.startsWith(`iobroker.${adapter}@`) &&
                        <Tooltip title={t('Non-NPM-Version: ') + installedFrom}>
                            <GitHubIcon
                                fontSize="small"
                                className={classes.versionWarn}
                            />
                        </Tooltip>}
                        {installedVersion}
                    </div>
                </Typography>}
            </div>
        </CardContent>
    </Card>;
};

AdapterTile.propTypes = {
    commandRunning: PropTypes.bool,
    rating: PropTypes.object,
    onSetRating: PropTypes.func,
};

export default withStyles(styles)(AdapterTile);
