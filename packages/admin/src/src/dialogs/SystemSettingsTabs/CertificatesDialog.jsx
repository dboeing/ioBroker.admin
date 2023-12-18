// CertificatesDialog.js
import React, { Component } from 'react';
import Dropzone from 'react-dropzone';
import PropTypes from 'prop-types';

import { withStyles } from '@mui/styles';

import {
    Fab, IconButton, InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
} from '@mui/material';

import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

import {
    withWidth,
    I18n,
    Utils as UtilsCommon,
} from '@iobroker/adapter-react-v5';

import Utils from '../../Utils';

// icons

const styles = () => ({
    tabPanel: {
        width: '100%',
        height: '100% ',
        overflow: 'auto',
        overflowX: 'hidden',
        padding: 15,
        position: 'relative',
    },
    tableContainer: {
        zIndex: 100,
    },
    table: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
    },
    buttonPanel: {
        paddingBottom: 40,
        display: 'flex',
    },
    descriptionPanel: {
        width: '100%',
        backgroundColor: 'transparent',
        marginLeft: 40,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
    },
    littleRow: {
        width: 110,
    },
    nameRow: {
        width: 220,
    },
    input: {
        width: '100%',
    },
});

class CertificatesDialog extends Component {
    constructor(props) {
        super(props);

        this.state = {
            chClass: false,
        };
    }

    static certToArray(certs) {
        return Utils.objectMap(certs, (cert, name) => ({
            title: name,
            data: cert,
        }));
    }

    static arrayToCert(array) {
        const result = {};
        for (const k in array) {
            result[array[k].title] = array[k].data;
        }

        return result;
    }

    static detectType(name) {
        name = name.toLowerCase();

        if (name.includes('public') || name.includes('cert')) {
            return 'public';
        } if (name.includes('priv') || name.includes('key')) {
            return 'private';
        } if (name.includes('chain') || name.includes('ca')) {
            return 'chained';
        }
        return '';
    }

    render() {
        const { classes } = this.props;
        const arr = CertificatesDialog.certToArray(this.props.data.native.certificates);

        const rows = arr.map((e, i) => {
            const type = CertificatesDialog.detectType(e.title);

            return <TableRow key={i} className="float_row">
                <TableCell className={`${this.props.classes.littleRow} float_cell`}>
                    {i + 1}
                </TableCell>
                <TableCell className={`${this.props.classes.nameRow} float_cell`}>
                    <TextField
                        disabled={this.props.saving}
                        variant="standard"
                        value={e.title}
                        InputLabelProps={{ shrink: true }}
                        className={`${this.props.classes.input} xs-centered`}
                        onChange={evt => this.onChangeText(evt.target.value, e.title, 'title')}
                        error={!type}
                        helperText={type || I18n.t('Unknown type: use in name "private", "public" or "chained" to define the certificate type')}
                        InputProps={{
                            readOnly: false,
                            endAdornment: e.title ? <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => this.onChangeText('', e.title, 'title')}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </InputAdornment> : null,
                        }}
                    />
                </TableCell>
                <TableCell className="grow_cell float_cell">
                    <TextField
                        disabled={this.props.saving}
                        variant="standard"
                        id={`default_${i}`}
                        value={e.data}
                        InputLabelProps={{ shrink: true }}
                        className={`${this.props.classes.input} xs-centered`}
                        onChange={evt => {
                            let value = evt.target.value.replace(/\r/g, '').replace(/\n/g, '');
                            if (value.startsWith('--')) {
                                const parts = value.split('-----');
                                parts[2] = parts[2].replace(/\s/g, '');
                                value = `-----${parts[1]}-----\r\n${parts[2]}\r\n-----${parts[3]}-----`;
                            }

                            this.onChangeText(value, e.title, 'data');
                        }}
                        InputProps={{
                            readOnly: false,
                            endAdornment: e.data ? <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => this.onChangeText('', e.title, 'data')}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </InputAdornment> : null,
                        }}
                    />
                </TableCell>
                <TableCell className={`${this.props.classes.littleRow} float_cell`}>
                    <Fab
                        disabled={this.props.saving}
                        size="small"
                        color="secondary"
                        aria-label="add"
                        onClick={() => this.onDelete(e.title)}
                    >
                        <DeleteIcon />
                    </Fab>
                </TableCell>
            </TableRow>;
        });
        return <div className={classes.tabPanel}>
            <Dropzone noClick>
                {({
                    getRootProps, getInputProps, acceptedFiles, fileRejections,
                }) => (
                    <div {...getRootProps({
                        className: this.state.chClass ? 'drop-container drop-dop' : 'drop-container',
                        onDragEnter: () => this.setState({ chClass: true }),
                        onDragLeave: () => this.setState({ chClass: false }),
                        onDrop: () => {
                            if (this.props.saving) {
                                // ignore
                                return;
                            }
                            if (fileRejections.length) {
                                const msg = [];
                                // eslint-disable-next-line array-callback-return
                                fileRejections.map((e => {
                                    const m = `${e.file.name}: `;
                                    const mm = [];
                                    e.errors.forEach(ee => mm.push(ee.message));
                                    msg.push(m + mm.join(','));
                                }));

                                alert(msg.join(', '));
                            }

                            if (acceptedFiles.length) {
                                // eslint-disable-next-line array-callback-return
                                acceptedFiles.map(file => {
                                    const reader = new FileReader();
                                    reader.onload = async e =>
                                        this.onAdd(file.name, e.target.result);
                                    reader.readAsText(file);
                                });
                            } else if (!fileRejections.length) {
                                alert(this.props.t('No files exists'));
                            }

                            this.setState({ chClass: false });
                        },
                    })}
                    >
                        <input {...getInputProps()} />
                    </div>
                )}
            </Dropzone>
            <div className={classes.buttonPanel}>
                <Fab
                    disabled={this.props.saving}
                    size="small"
                    className="small_size"
                    color="primary"
                    aria-label="add"
                    onClick={() => this.onAdd()}
                >
                    <AddIcon />
                </Fab>
                <Paper variant="outlined" className={classes.descriptionPanel}>
                    {this.props.t('certs_hint')}
                </Paper>
            </div>
            <TableContainer className={classes.tableContainer}>
                <Table className={classes.table} aria-label="customized table">
                    <TableHead>
                        <TableRow className="float_row">
                            <TableCell className={UtilsCommon.clsx(this.props.classes.littleRow, 'float_cell')}> </TableCell>
                            <TableCell className={UtilsCommon.clsx(this.props.classes.nameRow, 'float_cell')}>
                                {this.props.t('name')}
                            </TableCell>
                            <TableCell className={UtilsCommon.clsx('grow_cell', 'float_cell')}>
                                {this.props.t('Certificate')}
                            </TableCell>
                            <TableCell className={UtilsCommon.clsx(this.props.classes.littleRow, 'float_cell')}> </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>;
    }

    onChangeText = (value, id, name) => {
        const newData = JSON.parse(JSON.stringify(this.props.data));
        const array = CertificatesDialog.certToArray(newData.native.certificates);
        array.find(element => element.title === id)[name] = value;
        newData.native.certificates = CertificatesDialog.arrayToCert(array);
        this.props.onChange(newData);
    };

    onDelete = id => {
        const newData = JSON.parse(JSON.stringify(this.props.data));
        const array = CertificatesDialog.certToArray(newData.native.certificates);
        const index = array.findIndex(element => element.title === id);
        delete array[index];
        newData.native.certificates = CertificatesDialog.arrayToCert(array);
        this.props.onChange(newData);
    };

    onAdd = (title, data) => {
        const newData = JSON.parse(JSON.stringify(this.props.data));
        const array = CertificatesDialog.certToArray(newData.native.certificates);
        if (!title) {
            let i = 1;
            // eslint-disable-next-line
            while (array.find(item => item.title === `${this.props.t('certificate')}_${i}`)) {
                i++;
            }
            title = `${this.props.t('certificate')}_${i}`;
        }

        array.push({
            title: title || '__',
            data:  data || '',
        });
        newData.native.certificates = CertificatesDialog.arrayToCert(array);
        this.props.onChange(newData);
    };
}

CertificatesDialog.propTypes = {
    t: PropTypes.func,
    data: PropTypes.object,
    onChange: PropTypes.func,
    saving: PropTypes.bool,
};

export default withWidth()(withStyles(styles)(CertificatesDialog));
