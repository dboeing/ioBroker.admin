import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import { amber, blue, red } from '@mui/material/colors';

import {
    Grid, LinearProgress, Paper, Switch, Typography,
} from '@mui/material';

import Router from '@iobroker/adapter-react-v5/Components/Router';

import Utils from '../Utils';

const styles = theme => ({
    log: {
        height: 400,
        width: 860,
        padding: theme.spacing(1),
        overflowY: 'auto',
    },
    logNoSpacing: {
        height: '100%',
        width: 'calc(100% - 8px)',
        marginLeft: 8,
        padding: theme.spacing(1),
        overflowY: 'auto',
    },
    error: {
        color: red[500],
    },
    info: {
        color: blue[500],
    },
    warn: {
        color: amber[500],
    },
});

class Command extends Component {
    constructor(props) {
        super(props);

        this.state = {
            log: [`$ iobroker ${props.cmd || ''}`],
            init: false,
            max: null,
            value: null,
            // progressText: '',
            moreChecked: true,
            stopped: false,
        };

        this.logRef = React.createRef();

        const pattern = ['error', 'warn', 'info'];
        this.regExp = new RegExp(pattern.join('|'), 'i');
    }

    componentDidMount() {
        if (this.props.ready && this.props.cmd) {
            console.log(`STARTED: ${this.props.cmd}`);
            this.executeCommand();
        }
        // try {
        //     const closeOnReady = JSON.parse((window._localStorage || window.localStorage).getItem('CommandDialog.closeOnReady')) || false;
        //     this.setState({ closeOnReady });
        // } catch (error) {
        //     this.setState({ closeOnReady: false });
        // }
    }

    componentDidUpdate() {
        if (!this.state.init && this.props.ready && this.props.cmd) {
            this.executeCommand();
        }
        if (this.props.logsRead && JSON.stringify(this.props.logsRead) !== JSON.stringify(this.state.log)) {
            this.setState({ log: this.props.logsRead });
        }
        this.logRef.current?.scrollIntoView();
    }

    executeCommand() {
        this.setState({ init: true }, () => this.props.onSetCommandRunning && this.props.onSetCommandRunning(true));

        this.props.socket.registerCmdStdoutHandler(this.cmdStdoutHandler.bind(this));
        this.props.socket.registerCmdStderrHandler(this.cmdStderrHandler.bind(this));
        this.props.socket.registerCmdExitHandler(this.cmdExitHandler.bind(this));

        const activeCmdId = Math.floor(Math.random() * 0xFFFFFFE) + 1;

        this.setState({ activeCmdId });

        this.props.socket.cmdExec(this.props.host.startsWith('system.host.') ? this.props.host : (`system.host.${this.props.host}`), this.props.cmd, activeCmdId)
            .catch(error =>
                console.log(error));
    }

    cmdStdoutHandler(id, text) {
        if (this.state.activeCmdId && this.state.activeCmdId === id) {
            const log = this.state.log.slice();
            log.push(text);

            const upload = text.match(/^upload \[(\d+)]/);
            const gotAdmin = !upload ? text.match(/^got [-_:/\\.\w\d]+\/admin$/) : null;
            const gotWww = !gotAdmin ? text.match(/^got [-_:/\\.\w\d]+\/www$/) : null;

            let max = this.state.max;
            let value = null;
            // let progressText = '';

            if (upload) {
                max = max || parseInt(upload[1], 10);
                value = parseInt(upload[1], 10);
            } else if (gotAdmin) {
                // upload of admin
                // progressText = this.t('Upload admin started');
                max = null;
            } else if (gotWww) {
                // upload of www
                // progressText = this.t('Upload www started');
                max = null;
            }

            this.setState({
                log,
                max,
                value,
                // progressText,
            });

            console.log('cmdStdout');
        }
    }

    cmdStderrHandler(id, text) {
        if (this.state.activeCmdId && this.state.activeCmdId === id) {
            const log = this.state.log.slice();
            log.push(text);

            this.setState({ log });

            console.log('cmdStderr');
            console.log(id);
            console.log(text);
        }
    }

    cmdExitHandler(id, exitCode) {
        if (this.state.activeCmdId && this.state.activeCmdId === id) {
            const log = this.state.log.slice();
            if (!window.document.hidden && exitCode === 0 && log.length && log[log.length - 1].endsWith('created') && this.props.callback) {
                const newArr = log[log.length - 1].split(' ');
                const adapter = newArr.find(el => el.startsWith('system'));
                if (adapter) {
                    // it takes some time to creat the object
                    setTimeout(_adapter => {
                        this.props.socket.getObject(_adapter)
                            .then(obj => {
                                Utils.fixAdminUI(obj);
                                obj && obj.common?.adminUI?.config !== 'none' && Router.doNavigate('tab-instances', 'config', _adapter);
                            });
                    }, 1000, adapter);
                }
            }
            log.push(`${exitCode !== 0 ? 'ERROR: ' : ''}Process exited with code ${exitCode}`);

            this.setState({ log, stopped: true }, () => {
                this.props.onSetCommandRunning && this.props.onSetCommandRunning(false);
                if (exitCode !== 0) {
                    this.props.errorFunc && this.props.errorFunc(exitCode, this.state.log);
                } else {
                    this.props.performed && this.props.performed();
                    this.props.onFinished(exitCode, this.state.log);
                }
                console.log('cmdExit');
                console.log(id);
                console.log(exitCode);

                if (typeof this.props.callback === 'function') {
                    this.props.callback(exitCode);
                }
            });
        }
    }

    colorize(text, maxLength) {
        if (maxLength !== undefined) {
            text = text.substring(0, maxLength);
        }

        if (text.search(this.regExp)) {
            const result = [];
            const { classes } = this.props;

            while (text.search(this.regExp) >= 0) {
                const [match] = text.match(this.regExp);
                const pos = text.search(this.regExp);

                if (pos > 0) {
                    const part = text.substring(0, pos);
                    const message = Utils.parseColorMessage(part);
                    result.push(<span key={result.length}>{typeof message === 'object' ? message.parts.map((item, i) => <span key={i} style={item.style}>{item.text}</span>) : message}</span>);
                    text = text.replace(part, '');
                }

                const part = text.substr(0, match.length);
                if (part) {
                    const message = Utils.parseColorMessage(part);
                    result.push(<span key={result.length} className={classes[match.toLowerCase()]}>{typeof message === 'object' ? message.parts.map((item, i) => <span key={i} style={item.style}>{item.text}</span>) : message}</span>);
                    text = text.replace(part, '');
                }
            }

            if (text) {
                const message = Utils.parseColorMessage(text);
                result.push(<span key={result.length}>{typeof message === 'object' ? message.parts.map((item, i) => <span key={i} style={item.style}>{item.text}</span>) : message}</span>);
            }

            return result;
        }

        return text;
    }

    getLog() {
        return this.state.log.map((value, index) => <Typography
            ref={index === this.state.log.length - 1 ? this.logRef : undefined}
            key={index}
            component="p"
            variant="body2"
        >
            {this.colorize(value)}
        </Typography>);
    }

    render() {
        const classes = this.props.classes;

        return <Grid
            style={this.props.noSpacing ? { height: '100%', width: '100%' } : {}}
            container
            direction="column"
            spacing={this.props.noSpacing ? 0 : 2}
        >
            {this.props.showElement && <Grid item>
                {!this.state.stopped && <LinearProgress
                    style={this.props.commandError ? { backgroundColor: '#f44336' } : null}
                    variant={this.props.inBackground ? 'determinate' : 'indeterminate'}
                    value={this.state.max && this.state.value ? 100 - Math.round((this.state.value / this.state.max) * 100) : this.props.commandError ? 0 : 100}
                />}
            </Grid>}
            <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: this.props.inBackground ? 'space-between' : 'flex-end',
            }}
            >
                <Typography
                    style={this.props.inBackground ? {
                        width: 'calc(100% - 180px)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    } : { display: 'none' }}
                    component="div"
                >
                    {this.colorize(this.state.log[this.state.log.length - 1])}
                </Typography>
                {this.props.showElement && <Typography component="div" style={{ width: 250 }}>
                    <Grid component="label" container alignItems="center" spacing={1}>
                        <Grid item>{this.props.t('less')}</Grid>
                        <Grid item>
                            <Switch
                                checked={this.state.moreChecked}
                                onChange={event => this.setState({ moreChecked: event.target.checked })}
                                color="primary"
                            />
                        </Grid>
                        <Grid item>{this.props.t('more')}</Grid>
                    </Grid>
                </Typography>}
            </div>
            <Grid item style={this.props.noSpacing ? { height: 'calc(100% - 45px)', width: '100%' } : {}}>
                {this.state.moreChecked && <Paper className={this.props.noSpacing ? classes.logNoSpacing : classes.log}>
                    {this.getLog()}
                </Paper>}
            </Grid>
        </Grid>;
    }
}

Command.defaultProps = {
    showElement: true,
};

Command.propTypes = {
    noSpacing: PropTypes.bool,
    host: PropTypes.string.isRequired,
    callback: PropTypes.func.isRequired,
    socket: PropTypes.object.isRequired,
    onFinished: PropTypes.func.isRequired,
    ready: PropTypes.bool.isRequired,
    t: PropTypes.func.isRequired,
    inBackground: PropTypes.bool,
    commandError: PropTypes.bool,
    errorFunc: PropTypes.func,
    performed: PropTypes.func,
    cmd: PropTypes.string.isRequired,
    onSetCommandRunning: PropTypes.func.isRequired,
    showElement: PropTypes.bool,
};

export default withStyles(styles)(Command);
