import { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import {
    AppBar, CardMedia, CircularProgress, IconButton, Paper, Toolbar,
} from '@mui/material';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import { Utils, ToggleThemeMenu } from '@iobroker/adapter-react-v5';

import Config from './Config';
import EasyModeCard from '../components/EasyModeCard';

const styles = theme => ({
    appBar: {
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    wrapperEasyMode: {
        height: '100%',
        borderRadius: 0,
    },
    wrapperCard: {
        padding: '80px 20px 20px',
        height: '100%',
        overflowY: 'auto',
    },
    controlHeight: {
        display: 'flex',
        flexFlow: 'wrap',
        justifyContent: 'center',
    },
    img: {
        width: 60,
        height: 60,
        position: 'relative',
        borderRadius: 60,
    },
    logoWhite: {
        background: 'white',
    },
    wrapperHeader: {
        display: 'flex',
        alignItems: 'center',

    },
    headerName: {
        fontSize: 24,
        marginLeft: 10,
    },
    toolBar: {
        justifyContent: 'space-between',
        margin: '5px 0',
    },
    paper: {
        height: '100%',
        paddingTop: 80,
    },
    iframe: {
        height: '100%',
        width: '100%',
        background: '#FFF',
        color: '#000',
        borderRadius: 5,
        border: '1px solid #888',
    },
    IconButtons: {
        display: 'flex',
    },
    logoPointer: {
        cursor: 'pointer',
    },
});

class EasyMode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            configs: this.props.configs,
            strictMode: !this.props.configs,
        };
    }

    componentDidMount() {
        if (!this.props.configs) {
            this.props.socket.getEasyMode()
                .then(config => this.setState({ configs: config.configs }));
        }
    }

    render() {
        const {
            classes,
            t,
            themeName,
            toggleTheme,
            navigate,
            location,
            socket,
            themeType,
            theme,
            width,
            isFloatComma,
            dateFormat,
            configStored,
            getLocation,
        } = this.props;

        const { configs, strictMode } = this.state;
        if (!configs) {
            return <CircularProgress />;
        }

        const tab = location.id;
        const currentInstance = configs.find(({ id }) => id === tab);
        return <Paper className={classes.wrapperEasyMode}>
            <AppBar
                color="default"
                position="fixed"
                className={classes.appBar}
            >
                <Toolbar className={classes.toolBar}>
                    <div className={classes.wrapperHeader}>
                        <CardMedia onClick={(strictMode && !getLocation().dialog) || currentInstance?.tab ? () => navigate(currentInstance?.tab ? 'easy' : 'tab-intro') : null} className={Utils.clsx(classes.img, themeName === 'colored' && classes.logoWhite, ((strictMode && !getLocation().dialog) || currentInstance?.tab) && classes.logoPointer)} component="img" image="img/no-image.png" />
                        <div className={classes.headerName}>{t('Easy Admin')}</div>
                    </div>
                    <div className={classes.IconButtons}>
                        {((strictMode && !getLocation().dialog) || currentInstance?.tab) && <IconButton size="large" onClick={() => navigate(currentInstance?.tab ? 'easy' : 'tab-intro')}>
                            <ArrowBackIcon />
                        </IconButton>}
                        <ToggleThemeMenu t={t} toggleTheme={toggleTheme} themeName={themeName} size="large" />
                    </div>
                </Toolbar>
            </AppBar>
            {currentInstance ?
                <Paper className={classes.paper}>
                    <Config
                        className={classes.iframe}
                        adapter={currentInstance.id.split('.')[0]}
                        instance={currentInstance.id.split('.')[1]}
                        jsonConfig={currentInstance.jsonConfig}
                        materialize={currentInstance.materialize}
                        tab={currentInstance?.tab}
                        socket={socket}
                        easyMode
                        themeName={themeName}
                        themeType={themeType}
                        theme={theme}
                        width={width}
                        t={t}
                        configStored={configStored}
                        dateFormat={dateFormat}
                        isFloatComma={isFloatComma}
                        // version={currentInstance.version} We don't need a version in easy mode
                        onRegisterIframeRef={ref => this.props.onRegisterIframeRef(ref)}
                        onUnregisterIframeRef={ref => this.props.onUnregisterIframeRef(ref)}
                    />
                </Paper> :
                <div className={classes.wrapperCard}>
                    <div className={classes.controlHeight}>
                        {configs
                            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
                            .map(el => <EasyModeCard
                                key={el.id}
                                lang={this.props.lang}
                                navigate={() => navigate(null, 'config', el.id)}
                                {...el}
                            />)}
                    </div>
                </div>}
        </Paper>;
    }
}

EasyMode.propTypes = {
    configs: PropTypes.array,
    socket: PropTypes.object,
    t: PropTypes.func,
    lang: PropTypes.string,

    onRegisterIframeRef: PropTypes.func,
    onUnregisterIframeRef: PropTypes.func,
};

export default withStyles(styles)(EasyMode);
