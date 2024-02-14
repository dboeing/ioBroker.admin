import React from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import Router from '@iobroker/adapter-react-v5/Components/Router';
import ConfirmDialog from '@iobroker/adapter-react-v5/Dialogs/Confirm';
import I18n from '@iobroker/adapter-react-v5/i18n';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';

import ObjectCustomEditor from '../components/Object/ObjectCustomEditor';
import ObjectHistoryData from '../components/Object/ObjectHistoryData';
import ObjectChart from '../components/Object/ObjectChart';
import MobileDialog from '../helpers/MobileDialog';

const styles = theme => ({
    dialog: {
        height: '100%',
    },
    paper: {
        height: 'calc(100% - 64px)',
    },
    content: {
        textAlign: 'center',
        overflow: 'hidden',
    },
    tabPanel: {
        width: '100%',
        overflow: 'hidden',
        height: `calc(100% - ${theme.mixins.toolbar.minHeight}px)`,
    },
    tabSelected: {
        color: theme.palette.mode === 'dark' ? theme.palette.secondary.contrastText : '#FFFFFF !important',
    },
    tabsIndicator: {
        backgroundColor: theme.palette.secondary.main,
    },
});

export const EXTENSIONS = {
    images: ['png', 'jpg', 'svg', 'jpeg'],
    code: ['js', 'json'],
    txt: ['log', 'txt', 'html', 'css', 'xml'],
};

class ObjectCustomDialog extends MobileDialog {
    constructor(props) {
        super(props);

        let currentTab = parseInt((window._localStorage || window.localStorage).getItem('App.objectCustomTab') || 0, 10);
        this.chartAvailable = this.isChartAvailable();

        if (this.chartAvailable) {
            const location = Router.getLocation();
            if (location.arg === 'chart') {
                currentTab = 2;
            } else if (location.arg === 'table') {
                currentTab = 1;
            }
        } else {
            currentTab = 0;
        }

        this.state = {
            hasChanges: false,
            currentTab,
            confirmDialog: false,
            mobile: MobileDialog.isMobile(),
            progressRunning: false,
        };

        this.saveFunc = null;
    }

    isChartAvailable() {
        let chartAvailable = this.props.objectIDs.length === 1;
        if (chartAvailable) {
            const id = this.props.objectIDs[0];
            if (this.props.objects[id] && this.props.objects[id].common && this.props.objects[id].common.custom && this.props.objects[id].common.custom) {
                chartAvailable = Object.keys(this.props.objects[id].common.custom).find(inst => {
                    const obj = this.props.objects[`system.adapter.${inst}`];
                    return obj && obj.common && obj.common.getHistory;
                });
            } else {
                chartAvailable = false;
            }
        }
        return chartAvailable;
    }

    renderCharts() {
        return <ObjectChart
            id="chart-tabpanel"
            isFloatComma={this.props.isFloatComma}
            showJumpToEchart
            t={this.props.t}
            lang={this.props.lang}
            expertMode={this.props.expertMode}
            socket={this.props.socket}
            obj={this.props.objects[this.props.objectIDs[0]]}
            customsInstances={this.props.customsInstances}
            themeType={this.props.themeType}
            objects={this.props.objects}
        />;
    }

    renderTable() {
        return <ObjectHistoryData
            id="table-tabpanel"
            t={this.props.t}
            isFloatComma={this.props.isFloatComma}
            lang={this.props.lang}
            expertMode={this.props.expertMode}
            socket={this.props.socket}
            obj={this.props.objects[this.props.objectIDs[0]]}
            customsInstances={this.props.customsInstances}
            themeName={this.props.themeName}
            objects={this.props.objects}
        />;
    }

    renderCustomEditor() {
        return <ObjectCustomEditor
            id="custom-settings-tabpanel"
            registerSaveFunc={func => this.saveFunc = func}
            t={this.props.t}
            lang={this.props.lang}
            expertMode={this.props.expertMode}
            socket={this.props.socket}
            objectIDs={this.props.objectIDs}
            customsInstances={this.props.customsInstances}
            objects={this.props.objects}
            onProgress={progressRunning => this.setState({ progressRunning })}
            reportChangedIds={this.props.reportChangedIds}
            onChange={(hasChanges, update) => {
                console.log(`changes ${hasChanges}`);
                this.setState({ hasChanges }, () => {
                    if (update) {
                        const chartAvailable = this.isChartAvailable();
                        if (chartAvailable !== this.chartAvailable) {
                            this.chartAvailable = chartAvailable;
                            this.forceUpdate();
                        }
                    }
                });
            }}
            theme={this.props.theme}
            themeName={this.props.themeName}
            themeType={this.props.themeType}
        />;
    }

    renderConfirmDialog() {
        if (!this.state.confirmDialog) {
            return null;
        }
        return <ConfirmDialog
            title={I18n.t('You have unsaved changes')}
            text={I18n.t('Discard?')}
            ok={I18n.t('Yes')}
            cancel={I18n.t('Cancel')}
            onClose={isYes =>
                this.setState({ confirmDialog: false }, () => isYes && this.props.onClose())}
        />;
    }

    onClose() {
        if (this.state.hasChanges) {
            this.setState({ confirmDialog: true });
        } else {
            this.props.onClose();
        }
    }

    render() {
        const varType = this.props.objects[this.props.objectIDs[0]]?.common?.type;

        return <Dialog
            classes={{ scrollPaper: this.props.classes.dialog, paper: this.props.classes.paper }}
            scroll="paper"
            open={!0}
            onClose={() => this.props.onClose()}
            fullWidth
            maxWidth="xl"
            aria-labelledby="form-dialog-title"
        >
            {this.renderConfirmDialog()}
            <DialogTitle>
                {
                    this.props.objectIDs.length > 1 ?
                        this.props.t('Edit config for %s states', this.props.objectIDs.length) :
                        this.props.t('Edit config: %s', this.props.objectIDs[0])
                }
            </DialogTitle>
            <DialogContent className={this.props.classes.content}>
                <AppBar position="static">
                    <Tabs
                        value={this.state.currentTab}
                        onChange={(event, newTab) => {
                            Router.doNavigate(null, null, null, newTab === 1 ? 'table' : (newTab === 2 ? 'chart' : 'config'));
                            this.setState({ currentTab: newTab });
                            (window._localStorage || window.localStorage).setItem('App.objectCustomTab', newTab);
                        }}
                        classes={{ indicator: this.props.classes.tabsIndicator }}
                        indicatorColor="secondary"
                    >
                        <Tab
                            disabled={this.state.progressRunning}
                            label={this.props.t('Custom settings')}
                            id="custom-settings-tab"
                            aria-controls="simple-tabpanel-0"
                            classes={{ selected: this.props.classes.tabSelected }}
                        />
                        {this.props.objectIDs.length === 1 && this.chartAvailable ? <Tab
                            disabled={this.state.progressRunning}
                            label={this.props.t('History data')}
                            id="history-data-tab"
                            aria-controls="simple-tabpanel-1"
                            classes={{ selected: this.props.classes.tabSelected }}
                        /> : null}
                        {(varType === 'number' || varType === 'boolean') && this.props.objectIDs.length === 1 && this.chartAvailable ? <Tab
                            disabled={this.state.progressRunning}
                            label={this.props.t('Chart')}
                            id="chart-tab"
                            aria-controls="simple-tabpanel-2"
                            classes={{ selected: this.props.classes.tabSelected }}
                        /> : null}
                    </Tabs>
                </AppBar>
                {this.state.currentTab === 0 ? <div className={this.props.classes.tabPanel}>{this.renderCustomEditor()}</div> : null}
                {this.props.objectIDs.length === 1 && this.chartAvailable && this.state.currentTab === 1 ? <div className={this.props.classes.tabPanel}>{this.renderTable()}</div> : null}
                {(varType === 'number' || varType === 'boolean') && this.props.objectIDs.length === 1 && this.chartAvailable && this.state.currentTab === 2 ? <div className={this.props.classes.tabPanel}>{this.renderCharts()}</div> : null}
            </DialogContent>
            <DialogActions>
                {this.state.currentTab === 0 && <Button
                    variant="contained"
                    color="primary"
                    disabled={!this.state.hasChanges || this.state.progressRunning}
                    onClick={() => this.saveFunc && this.saveFunc()}
                >
                    {this.getButtonTitle(<SaveIcon />, this.props.t('Save'))}
                </Button>}
                {this.state.currentTab === 0 && <Button
                    variant="contained"
                    color="primary"
                    disabled={!this.state.hasChanges || this.state.progressRunning}
                    onClick={() => {
                        if (this.saveFunc) {
                            this.saveFunc(error => !error && this.onClose());
                        }  else {
                            this.onClose();
                        }
                    }}
                >
                    {this.getButtonTitle(<SaveIcon />, this.props.t('Save & close'), <CloseIcon />)}
                </Button>}
                <Button
                    disabled={this.state.progressRunning}
                    variant="contained"
                    onClick={() => this.onClose()}
                    color="grey"
                >
                    {this.getButtonTitle(<CloseIcon />, this.props.t('Close'))}
                </Button>
            </DialogActions>
        </Dialog>;
    }
}

ObjectCustomDialog.propTypes = {
    t: PropTypes.func,
    lang: PropTypes.string,
    expertMode: PropTypes.bool,
    objects: PropTypes.object,
    socket: PropTypes.object,
    theme: PropTypes.object,
    themeName: PropTypes.string,
    themeType: PropTypes.string,
    customsInstances: PropTypes.array,
    objectIDs: PropTypes.array,
    onClose: PropTypes.func,
    reportChangedIds: PropTypes.func,
    isFloatComma: PropTypes.bool,
};

export default withStyles(styles)(ObjectCustomDialog);
