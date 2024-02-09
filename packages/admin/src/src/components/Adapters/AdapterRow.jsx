import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { withStyles } from '@mui/styles';

import { Utils } from '@iobroker/adapter-react-v5';

import {
    Avatar,
    CardMedia,
    Grid,
    IconButton,
    TableCell,
    TableRow,
    Tooltip,
    Typography,
    Rating,
} from '@mui/material';

import {
    amber,
    blue,
    green,
    red,
} from '@mui/material/colors';

import AddIcon from '@mui/icons-material/Add';
import AddToPhotosIcon from '@mui/icons-material/AddToPhotos';
import BuildIcon from '@mui/icons-material/RotateRight';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GitHubIcon from '@mui/icons-material/GitHub';
import HelpIcon from '@mui/icons-material/Help';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import sentryIcon from '../../assets/sentry.svg';

import MaterialDynamicIcon from '../../helpers/MaterialDynamicIcon';
import IsVisible from '../IsVisible';

const styles = theme => ({
    smallAvatar: {
        width: theme.spacing(4),
        height: theme.spacing(4),
        marginLeft: 4,
    },
    paddingNone: {
        padding: '0 !important',
    },
    hidden: {
        visibility: 'hidden',
    },
    name: {
        flexWrap: 'nowrap',
        width: 300,
        marginTop: 0,
    },
    nameDiv: {
        display: 'flex',
        alignItems: 'center',
    },
    categoryName: {
        fontWeight: 'bold',
        cursor: 'pointer',
    },
    green: {
        color: green[500],
    },
    blue: {
        color: blue[700],
    },
    category: {
        backgroundColor: theme.palette.background.default,
    },
    updateAvailable: {
        color: green[700],
    },
    wrongDependencies: {
        color: red[700],
    },
    grow: {
        flexGrow: 1,
    },
    displayNone: {
        display: 'none',
    },
    sentryIcon: {
        fontSize: '1.2rem',
    },
    versionWarn: {
        color: amber[500],
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
    buttonUpdateIcon: {
        height: 20,
        width: 20,
        marginRight: 10,
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
    marginRight5: {
        marginRight: 5,
    },
    flex: {
        display: 'flex',
    },
    sentry: {
        width: 21,
        height: 21,
        marginTop: 3,
        objectFit: 'fill',
        filter: 'invert(0%) sepia(90%) saturate(1267%) hue-rotate(-260deg) brightness(99%) contrast(97%)',
    },
    rating: {
        cursor: 'pointer',
        height: 18,
    },
    nameCell: {
        paddingTop: '0 !important',
        paddingBottom: '0 !important',
    },
    tooltip: {
        pointerEvents: 'none',
    },
});

class AdapterRow extends Component {
    renderVersion() {
        const {
            adapter,
            classes,
            enabledCount,
            installedCount,
            installedFrom,
            installedVersion,
            t,
        } = this.props;

        return <Grid
            container
            wrap="nowrap"
            alignItems="center"
            spacing={1}
        >
            <Grid item>
                {installedVersion +
                    (installedCount ? ` (${installedCount}${installedCount !== enabledCount ? '~' : ''})` : '')}
            </Grid>
            {installedFrom && !installedFrom.startsWith(`iobroker.${adapter}@`) &&
                <Grid item container>
                    <Tooltip title={t('Non-NPM-Version: ') + installedFrom}>
                        <GitHubIcon
                            fontSize="small"
                            className={classes.versionWarn}
                        />
                    </Tooltip>
                </Grid>}
        </Grid>;
    }

    render() {
        const isCategory = this.props.category;

        const {
            classes,
            connectionType,
            installedCount,
            installedVersion,
            updateAvailable,
            commandRunning,
            name,
            rightDependencies,
            rightOs,
            sentry,
            categoryName,
            openInstallVersionDialog,
            dataSource,
            descHidden,
            adapter,
            versionDate,
            onSetRating,
            rating,
        } = this.props;

        if (isCategory) {
            return <TableRow
                hover={false}
                className={Utils.clsx(classes.category, this.props.hidden && classes.displayNone)}
            >
                <TableCell>
                    <Grid container spacing={1} alignItems="center" className={classes.name}>
                        <Grid item>
                            <IconButton
                                size="small"
                                onClick={this.props.onToggle}
                            >
                                {this.props.expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                        </Grid>
                    </Grid>
                </TableCell>
                <TableCell onClick={this.props.onToggle}>
                    <div className={Utils.clsx(classes.nameDiv, classes.categoryName)}>
                        <MaterialDynamicIcon objIconBool iconName={categoryName} className={classes.marginRight5} />
                        {name}
                    </div>
                </TableCell>
                <TableCell colSpan={descHidden ? 5 : 6}>
                    <Typography component="span" variant="body2" className={classes.green}>
                        {installedCount}
                    </Typography>
                    {` ${this.props.t('of')} `}
                    <Typography component="span" variant="body2" className={classes.blue}>
                        {this.props.count}
                    </Typography>
                    {` ${this.props.t('Adapters from this Group installed')}`}
                </TableCell>
            </TableRow>;
        }
        return <TableRow
            hover
            className={this.props.hidden ? classes.displayNone : ''}
        >
            <TableCell />
            <TableCell>
                <Grid container spacing={1} alignItems="center" className={classes.name}>
                    <Tooltip title={this.props.adapter}>
                        <Grid item className={classes.paddingNone}>
                            <Avatar
                                variant="square"
                                alt={name}
                                src={this.props.image}
                                className={classes.smallAvatar}
                            />
                        </Grid>
                    </Tooltip>
                    {this.props.allowAdapterRating !== false ?
                        <Grid item className={classes.nameCell}>
                            <div>{name}</div>
                            {!versionDate ? <div
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
                        </Grid>
                        :
                        <Grid item>{name}</Grid>}
                </Grid>
            </TableCell>
            {!descHidden && <TableCell title={this.props.description}>{this.props.description}</TableCell>}
            <TableCell>
                <div className={classes.flex}>
                    {connectionType === 'cloud' ?
                        <Tooltip title={this.props.t('Adapter requires the specific cloud access for these devices/service')}><CloudIcon /></Tooltip> :
                        (connectionType === 'local' ?
                            <Tooltip title={this.props.t('Adapter does not use the cloud for these devices/service')}><CloudOffIcon /></Tooltip> : null)}
                    {dataSource && <div className={classes.marginLeft5}>
                        {(
                            dataSource === 'poll' ?
                                <Tooltip title={this.props.t('The device or service will be periodically asked')}>
                                    <ArrowUpwardIcon className={classes.classPoll} />
                                </Tooltip> :
                                dataSource === 'push' ?
                                    <Tooltip title={this.props.t('The device or service delivers the new state actively')}>
                                        <ArrowDownwardIcon className={classes.classPush} />
                                    </Tooltip> :
                                    dataSource === 'assumption' ?
                                        <Tooltip title={this.props.t('Adapter cannot request the exactly device status and the status will be guessed on the last sent command')}>
                                            <RemoveIcon className={classes.classAssumption} />
                                        </Tooltip> : null
                        )}
                    </div>}
                    {sentry && <div className={classes.marginLeft5}>
                        <Tooltip title="sentry" classes={{ popper: classes.tooltip }}>
                            <CardMedia
                                className={classes.sentry}
                                component="img"
                                image={sentryIcon}
                            />
                        </Tooltip>
                    </div>}
                </div>
            </TableCell>
            <TableCell>{installedVersion && this.renderVersion()}</TableCell>
            <TableCell className={Utils.clsx({
                [classes.updateAvailable]: updateAvailable && rightDependencies,
                [classes.wrongDependencies]: !rightDependencies,
            })}
            >
                <IsVisible value={this.props.allowAdapterUpdate}>
                    <Grid
                        container
                        alignItems="center"
                    >
                        {!commandRunning && updateAvailable ?
                            <Tooltip title={this.props.t('Update')}>
                                <div
                                    onClick={this.props.onUpdate}
                                    className={classes.buttonUpdate}
                                >
                                    <IconButton
                                        className={classes.buttonUpdateIcon}
                                        size="small"
                                    >
                                        <RefreshIcon />
                                    </IconButton>
                                    {this.props.version}
                                </div>
                            </Tooltip>
                            :
                            this.props.version}
                    </Grid>
                </IsVisible>
            </TableCell>
            <TableCell>{this.props.license}</TableCell>
            <TableCell>
                <IsVisible value={this.props.allowAdapterInstall}>
                    <Tooltip title={this.props.t('Add instance')}>
                        <IconButton
                            size="small"
                            className={!rightOs ? classes.hidden : ''}
                            onClick={rightOs ? this.props.onAddInstance : null}
                        >
                            <AddIcon />
                        </IconButton>
                    </Tooltip>
                </IsVisible>
                <IsVisible value={this.props.allowAdapterReadme}>
                    <Tooltip title={this.props.t('Readme')}>
                        <IconButton
                            size="small"
                            onClick={this.props.onInfo}
                        >
                            <HelpIcon />
                        </IconButton>
                    </Tooltip>
                </IsVisible>
                {this.props.expertMode &&
                        <Tooltip title={this.props.t('Upload')}>
                            <IconButton
                                size="small"
                                disabled={commandRunning}
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={this.props.onUpload}
                            >
                                <PublishIcon />
                            </IconButton>
                        </Tooltip>}
                <IsVisible value={this.props.allowAdapterDelete}>
                    <Tooltip title={this.props.t('Delete adapter')}>
                        <IconButton
                            size="small"
                            disabled={commandRunning}
                            className={!installedVersion ? classes.hidden : ''}
                            onClick={this.props.onDeletion}
                        >
                            <DeleteForeverIcon />
                        </IconButton>
                    </Tooltip>
                </IsVisible>
                {this.props.expertMode && this.props.allowAdapterUpdate !== false &&
                        <Tooltip title={this.props.t('Install a specific version')}>
                            <IconButton
                                size="small"
                                disabled={commandRunning}
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={openInstallVersionDialog}
                            >
                                <AddToPhotosIcon />
                            </IconButton>
                        </Tooltip>}
                {this.props.rebuild && this.props.expertMode &&
                        <Tooltip title={this.props.t('Rebuild')}>
                            <IconButton
                                size="small"
                                disabled={commandRunning}
                                className={!installedVersion ? classes.hidden : ''}
                                onClick={this.props.onRebuild}
                            >
                                <BuildIcon />
                            </IconButton>
                        </Tooltip>}
            </TableCell>
        </TableRow>;
    }
}

AdapterRow.propTypes = {
    adapter: PropTypes.string.isRequired,
    category: PropTypes.bool,
    connectionType: PropTypes.string,
    count: PropTypes.number,
    description: PropTypes.string,
    enabledCount: PropTypes.number,
    expanded: PropTypes.bool,
    expertMode: PropTypes.bool,
    hidden: PropTypes.bool,
    image: PropTypes.string,
    installedCount: PropTypes.number,
    installedFrom: PropTypes.string,
    installedVersion: PropTypes.string,
    name: PropTypes.string,
    license: PropTypes.string,
    onAddInstance: PropTypes.func,
    onDeletion: PropTypes.func,
    onRebuild: PropTypes.func,
    onToggle: PropTypes.func,
    onUpdate: PropTypes.func,
    onUpload: PropTypes.func,
    rebuild: PropTypes.bool,
    rightDependencies: PropTypes.bool,
    rightOs: PropTypes.bool,
    sentry: PropTypes.bool,
    t: PropTypes.func,
    descHidden: PropTypes.bool,
    updateAvailable: PropTypes.bool,
    version: PropTypes.string,
    commandRunning: PropTypes.bool,
    rating: PropTypes.object,
    onSetRating: PropTypes.func,
};

export default withStyles(styles)(AdapterRow);
