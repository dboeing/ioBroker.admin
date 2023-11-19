import { createRef, Component } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Paper from  '@mui/material/Paper';

import withWidth from '@iobroker/adapter-react-v5/Components/withWidth';

const styles = theme => ({
    paper: {
        height:    '100%',
        maxHeight: '100%',
        maxWidth:  '100%',
        overflow:  'auto',
        padding:   theme.spacing(1),
    },
    controlItem: {
        width: `calc(100% - ${theme.spacing(2)})`,
        marginBottom: theme.spacing(2),
        marginRight: theme.spacing(1),
        marginLeft: theme.spacing(1),
    },
    RAM: {
        width: 400,
        marginRight: theme.spacing(1),
    },
});

class BaseSettingsMultihost extends Component {
    constructor(props) {
        super(props);

        const settings = this.props.settings || {};

        this.state = {
            enabled:   settings.enabled  || false,
            secure:    settings.secure   || true,
            password:  '',
        };

        settings.password && this.props.socket.decrypt(settings.password)
            .then(plainPass =>
                this.setState({ password: plainPass }));

        this.focusRef = createRef();
    }

    componentDidMount() {
        this.focusRef.current && this.focusRef.current.focus();
    }

    onChange() {
        const newState = {
            enabled: this.state.enabled,
            secure:  this.state.secure,
        };

        if (this.state.password) {
            this.props.socket.encrypt(this.state.password)
                .then(encodedPass => {
                    newState.password = encodedPass;
                    this.props.onChange(newState);
                });
        } else {
            this.props.onChange(newState);
        }
    }

    render() {
        return <Paper className={this.props.classes.paper}>
            <form className={this.props.classes.form} noValidate autoComplete="off">
                <Grid item className={this.props.classes.gridSettings}>
                    <Grid container direction="column">
                        <Grid item className={this.props.classes.controlItem}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={this.state.enabled}
                                        onChange={e => this.setState({ enabled: e.target.checked }, () => this.onChange())}
                                    />
                                }
                                label={this.props.t('Allow slave connections')}
                            />
                            <div>{ this.props.t('When activated this host can be discovered by other iobroker installations in your network to become the master of a multihost system.')}</div>
                        </Grid>
                        <Grid item className={this.props.classes.controlItem}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={this.state.secure}
                                        onChange={e => this.setState({ secure: e.target.checked }, () => this.onChange())}
                                    />
                                }
                                label={this.props.t('With password')}
                            />
                            <div>{ this.props.t('Ask password by connection establishment') }</div>
                        </Grid>
                        { this.state.secure ? <Grid item>
                            <TextField
                                variant="standard"
                                label={this.props.t('Multi-host password')}
                                className={this.props.classes.controlItem}
                                value={this.state.password}
                                type="password"
                                inputProps={{
                                    autoComplete: 'new-password',
                                    form: {
                                        autoComplete: 'off',
                                    },
                                }}
                                autoComplete="off"
                                onChange={e => this.setState({ password: e.target.value }, () => this.onChange())}
                            />
                        </Grid> : null }
                    </Grid>
                </Grid>
            </form>
        </Paper>;
    }
}

BaseSettingsMultihost.propTypes = {
    t: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    settings: PropTypes.object.isRequired,
    socket: PropTypes.object,
};

export default withWidth()(withStyles(styles)(BaseSettingsMultihost));
