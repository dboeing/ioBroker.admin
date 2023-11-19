import { Component } from 'react';

import { withStyles } from '@mui/styles';

import PropTypes from 'prop-types';

import { Grid, Typography } from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import green from '@mui/material/colors/green';
import red from '@mui/material/colors/red';

const styles = {
    checkIcon: {
        color: green[700],
    },
    cancelIcon: {
        color: red[700],
    },
    wrapperContent:{
        display: 'flex',
        flexFlow: 'nowrap',
        alignItems: 'inherit',
    },
};

class State extends Component {
    getIcon() {
        if (this.props.state) {
            return <CheckCircleIcon className={this.props.classes.checkIcon} />;
        }
        return <CancelIcon className={this.props.classes.cancelIcon} />;
    }

    render() {
        return <Grid
            item
            container
            className={this.props.classes.wrapperContent}
            alignItems="center"
            direction="row"
            spacing={1}
        >
            <Grid item>
                { this.getIcon() }
            </Grid>
            <Grid item>
                <Typography>
                    { this.props.children }
                </Typography>
            </Grid>
        </Grid>;
    }
}

State.propTypes = {
    state: PropTypes.bool,
};

export default withStyles(styles)(State);
