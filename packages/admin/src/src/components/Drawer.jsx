import React, { Component } from 'react';
import { withStyles } from '@mui/styles';
import PropTypes from 'prop-types';

import {
    Avatar,
    Drawer as MaterialDrawer,
    IconButton,
    List,
    Typography,
    SwipeableDrawer,
} from '@mui/material';

import {
    ChevronLeft as ChevronLeftIcon,
    Apps as AppsIcon,
    Info as InfoIcon,
    Store as StoreIcon,
    Subtitles as SubtitlesIcon,
    ViewList as ViewListIcon,
    ArtTrack as ArtTrackIcon,
    Dvr as DvrIcon,
    ViewHeadline as ViewHeadlineIcon,
    Subscriptions as SubscriptionsIcon,
    FlashOn as FlashOnIcon,
    PersonOutline as PersonOutlineIcon,
    Storage as StorageIcon,
    FileCopy as FilesIcon,
} from '@mui/icons-material';

import {
    Utils, I18n, Icon, withWidth, IconLogout as LogoutIcon,
} from '@iobroker/adapter-react-v5';

import DragWrapper from './DragWrapper';
import CustomDragLayer from './CustomDragLayer';
import { ContextWrapper } from './ContextWrapper';
import CustomPopper from './CustomPopper';
import { getHref } from '@/tabs/CustomTab';
import DrawerItem from './DrawerItem';
import Adapters from '../tabs/Adapters';

export const DRAWER_FULL_WIDTH = 180;
export const DRAWER_COMPACT_WIDTH = 50;
export const DRAWER_EDIT_WIDTH = 250;

function ucFirst(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
}

const styles = theme => ({
    root: {
        flexShrink: 0,
        transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        display: 'flex',
        flexDirection: 'column',
    },
    rootFullWidth: {
        width: DRAWER_FULL_WIDTH,
    },
    rootEditWidth: {
        width: DRAWER_EDIT_WIDTH,
    },
    rootCompactWidth: {
        width: DRAWER_COMPACT_WIDTH,
    },
    paper: {
        width: 'inherit',
        overflowX: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        ...theme.mixins.toolbar,
        justifyContent: 'flex-end',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: theme.palette.background.default,
    },
    headerCompact: {
        padding: 0,
    },
    headerLogout: {
        justifyContent: 'space-between',
    },
    list: {
        paddingTop: 0,
        flex: '1 0 auto',
    },
    logout: {
        color: theme.palette.primary.main,
    },
    icon: {
        width: 20,
        height: 20,
    },
    logoWhite: {
        background: '#FFFFFF',
    },
    logoSize: {
        width: 50,
        height: 50,
    },
    avatarBlock: {
        width: '100%',
        display: 'flex',
        // justifyContent: 'center',
        // marginLeft: 48,
        marginTop: 5,
        marginBottom: 5,
    },
    avatarNotVisible: {
        opacity: 0,
        transition: 'opacity 0.3s',
    },
    avatarVisible: {
        opacity: 1,
    },
    expand: {
        marginBottom: 5,
        marginLeft: 5,
    },
    styleVersion: {
        fontSize: 10,
        color: theme.palette.mode === 'dark' ? '#ffffff5e' : '#0000005e',
        alignSelf: 'center',
        marginLeft: 5,
    },
    editButton: {
        position: 'sticky',
        bottom: 0,
        right: 0,
        width: 'fit-content',
        marginLeft: 'auto',
        marginTop: 'auto',
        transition: 'opacity 0.5s',
    },
});

export const STATES = {
    opened: 0,
    closed: 1,
    compact: 2,
};

const tabsInfo = {
    'tab-intro':            { order: 1,    icon: <AppsIcon /> },
    'tab-info':             { order: 5,    icon: <InfoIcon />,               host: true },
    'tab-adapters':         { order: 10,   icon: <StoreIcon />,              host: true },
    'tab-instances':        { order: 15,   icon: <SubtitlesIcon />,          host: true },
    'tab-objects':          { order: 20,   icon: <ViewListIcon /> },
    'tab-enums':            { order: 25,   icon: <ArtTrackIcon /> },
    'tab-devices':          { order: 27,   icon: <DvrIcon />,                host: true },
    'tab-logs':             { order: 30,   icon: <ViewHeadlineIcon />,       host: true },
    'tab-scenes':           { order: 35,   icon: <SubscriptionsIcon /> },
    'tab-events':           { order: 40,   icon: <FlashOnIcon /> },
    'tab-users':            { order: 45,   icon: <PersonOutlineIcon /> },
    'tab-javascript':       { order: 50 },
    'tab-text2command-0':   { order: 55, instance: 0 },
    'tab-text2command-1':   { order: 56, instance: 1 },
    'tab-text2command-2':   { order: 57, instance: 2 },
    'tab-node-red-0':       { order: 60, instance: 0 },
    'tab-node-red-1':       { order: 61, instance: 1 },
    'tab-node-red-2':       { order: 62, instance: 2 },
    'tab-fullcalendar-0':   { order: 65, instance: 0 },
    'tab-fullcalendar-1':   { order: 66, instance: 1 },
    'tab-fullcalendar-2':   { order: 67, instance: 2 },
    'tab-echarts':          { order: 70, instance: 2 },
    'tab-eventlist-0':      { order: 80, instance: 0 },
    'tab-eventlist-1':      { order: 81, instance: 1 },
    'tab-eventlist-2':      { order: 82, instance: 2 },
    'tab-hosts':            { order: 100,  icon: <StorageIcon /> },
    'tab-files':            { order: 110,  icon: <FilesIcon /> },
};

class Drawer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            tabs: [],
            logErrors: 0,
            logWarnings: 0,
            hostError: 0,
            hostsUpdate: Drawer.calculateHostUpdates(this.props.hosts, this.props.repository),
            adaptersUpdate: Drawer.calculateAdapterUpdates(this.props.installed, this.props.repository),
        };

        this.refEditButton = React.createRef();

        this.getTabs();
    }

    static getDerivedStateFromProps(props, state) {
        const hostsUpdate = Drawer.calculateHostUpdates(props.hosts, props.repository);
        const adaptersUpdate = Drawer.calculateAdapterUpdates(props.installed, props.repository);
        if (hostsUpdate !== state.hostsUpdate || adaptersUpdate !== state.adaptersUpdate) {
            return { hostsUpdate, adaptersUpdate };
        }
        return null;
    }

    static calculateHostUpdates(hosts, repository) {
        if (hosts && repository) {
            const jsControllerVersion = repository['js-controller']?.version || '';
            let count = 0;
            hosts.forEach(element => {
                if (Adapters.updateAvailable(element.common.installedVersion, jsControllerVersion)) {
                    count++;
                }
            });
            return count;
        }
        return 0;
    }

    static calculateAdapterUpdates(installed, repository) {
        if (installed) {
            let count = 0;

            Object.keys(installed).sort().forEach(element => {
                const _installed = installed[element];
                const adapter = repository && repository[element];
                if (element !== 'js-controller' &&
                    element !== 'hosts' &&
                    _installed?.version &&
                    adapter?.version &&
                    _installed.ignoreVersion !== adapter.version &&
                    Adapters.updateAvailable(_installed.version, adapter.version)
                ) {
                    count++;
                }
            });

            return count;
        }
        return 0;
    }

    instanceChangedHandler = () => this.getTabs(true);

    componentDidMount() {
        this.props.instancesWorker.registerHandler(this.instanceChangedHandler, true);

        this.onNotificationsHandler()
            .then(() => {
                this.props.hostsWorker.registerNotificationHandler(this.onNotificationsHandler);

                if (!this.logsHandlerRegistered) {
                    this.logsHandlerRegistered = true;
                    this.props.logsWorker.registerErrorCountHandler(this.onErrorsUpdates);
                    this.props.logsWorker.registerWarningCountHandler(this.onWarningsUpdates);
                }
            });
    }

    onNotificationsHandler = () => this.props.hostsWorker.getNotifications()
        .then(notifications => this.calculateWarning(notifications))
        .catch(error => window.alert(`Cannot get notifications: ${error}`));

    onErrorsUpdates = logErrors => {
        if (this.props.currentTab !== 'tab-logs' || (this.props.currentTab === 'tab-logs' && this.state.logErrors)) {
            this.setState({ logErrors });
        }
    };

    onWarningsUpdates = logWarnings => {
        if (this.props.currentTab !== 'tab-logs' || (this.props.currentTab === 'tab-logs' && this.state.logWarnings)) {
            this.setState({ logWarnings });
        }
    };

    calculateWarning = notifications => {
        if (!notifications) {
            return;
        }

        let count = 0;

        Object.keys(notifications).forEach(host => {
            if (!notifications[host]?.result?.system) {
                return;
            }

            if (Object.keys(notifications[host].result.system.categories).length) {
                const obj = notifications[host].result.system.categories;

                Object.keys(obj).forEach(nameTab =>
                    Object.keys(obj[nameTab].instances).forEach(() => count++));
            }
        });

        this.setState({ hostError: count });
    };

    componentWillUnmount() {
        this.props.instancesWorker.unregisterHandler(this.instanceChangedHandler);
        this.props.hostsWorker.unregisterNotificationHandler(this.onNotificationsHandler);

        if (this.logsHandlerRegistered) {
            this.logsHandlerRegistered = false;
            this.props.logsWorker.unregisterErrorCountHandler(this.onErrorsUpdates);
            this.props.logsWorker.unregisterWarningCountHandler(this.onWarningsUpdates);
        }
    }

    componentDidUpdate() {
        if (!this.isSwipeable() && this.props.state !== STATES.opened && this.props.editMenuList) {
            setTimeout(() => this.props.setEditMenuList(false));
        }
    }

    getTabs(update) {
        return this.props.socket.getCompactInstances(update)
            .then(instances => {
                const dynamicTabs = [];
                if (instances) {
                    Object.keys(instances).forEach(id => {
                        const instance = instances[id];

                        if (!instance || !instance.adminTab) {
                            return;
                        }

                        let tab = `tab-${id.replace('system.adapter.', '').replace(/\.\d+$/, '')}`;

                        const singleton = instance.adminTab.singleton;
                        let instNum;
                        if (!singleton) {
                            const m = id.match(/\.(\d+)$/);
                            if (m) {
                                instNum = parseInt(m[1], 10);
                                tab += `-${instNum}`;
                            }
                        }

                        if (dynamicTabs.find(item => item.name === tab)) {
                            return;
                        }

                        let title;

                        if (instance.adminTab.name) {
                            if (typeof instance.adminTab.name === 'object') {
                                if (instance.adminTab.name[this.props.lang]) {
                                    title = instance.adminTab.name[this.props.lang];
                                } else if (instance.adminTab.name.en) {
                                    title = this.props.t(instance.adminTab.name.en);
                                } else {
                                    title = this.props.t(instance.name);
                                }
                            } else {
                                title = this.props.t(instance.adminTab.name);
                            }
                        } else {
                            title = this.props.t(instance.name);
                        }

                        let obj;
                        if (tabsInfo[tab]) {
                            obj = { name: tab, ...tabsInfo[tab] };
                        } else {
                            obj = { name: tab, order: instance.adminTab.order !== undefined ? instance.adminTab.order : 200, icon: instance.adminTab.icon };
                        }

                        if (!obj.icon) {
                            obj.icon = `adapter/${instance.name}/${instance.icon}`;
                        } else if (typeof obj.icon !== 'object' && !obj.icon.startsWith('data:image') && !obj.icon.includes('/')) {
                            obj.icon = `adapter/${instance.name}/${obj.icon}`;
                        }

                        obj.title = title;

                        if (!singleton) {
                            // obj.instance = instance;
                            if (instNum) {
                                obj.title += ` ${instNum}`;
                            }
                        }
                        dynamicTabs.push(obj);
                    });
                }

                const READY_TO_USE = ['tab-intro', 'tab-adapters', 'tab-instances', 'tab-logs', 'tab-files', 'tab-objects', 'tab-hosts', 'tab-users', 'tab-enums'];
                // DEV ONLY
                let tabs = Object.keys(tabsInfo).filter(name => READY_TO_USE.includes(name));

                tabs = tabs.map(name => {
                    const obj = { name, ...tabsInfo[name] };
                    obj.title = I18n.t(ucFirst(name.replace('tab-', '').replace('-0', '').replace(/-(\d+)$/, ' $1')));
                    obj.visible = true;
                    return obj;
                });

                // add dynamic tabs
                tabs = tabs.concat(dynamicTabs);

                tabs = tabs.filter(obj => obj);
                tabs.forEach(obj => obj.visible = true);

                tabs.sort((a, b) => {
                    if (a.order && b.order) {
                        return a.order - b.order;
                    } if (a.order) {
                        return -1;
                    } if (b.order) {
                        return 1;
                    }
                    return a.name > b.name ? -1 : (a.name > b.name ? 1 : 0);
                });

                // Convert
                this.props.socket.getCompactSystemConfig()
                    .then(systemConfig => {
                        systemConfig.common.tabsVisible = systemConfig.common.tabsVisible || [];

                        tabs.forEach(tab => {
                            const it = systemConfig.common.tabsVisible.find(el => el.name === tab.name);
                            if (it) {
                                tab.visible = it.visible;
                            }
                        });

                        const map = {};
                        systemConfig.common.tabsVisible.forEach((item, i) => map[item.name] = i);

                        tabs.sort((a, b) => {
                            const aa = map[a.name];
                            const bb = map[b.name];
                            if (aa !== undefined && bb !== undefined) {
                                return aa - bb;
                            } if (aa) {
                                return -1;
                            } if (bb) {
                                return 1;
                            }
                            return 0;
                        });

                        this.setState({ tabs }, () => {
                            const tabsVisible = tabs.map(({ name, visible }) => ({ name, visible }));

                            if (JSON.stringify(tabsVisible) !== JSON.stringify(systemConfig.common.tabsVisible)) {
                                this.props.socket.getSystemConfig(true)
                                    .then(_systemConfig => {
                                        _systemConfig.common.tabsVisible = tabsVisible;

                                        return this.props.socket.setSystemConfig(_systemConfig)
                                            .catch(e => window.alert(`Cannot set system config: ${e}`));
                                    });
                            }
                        });
                    });
            })
            .catch(error => window.alert(`Cannot get instances: ${error}`));
    }

    getHeader() {
        const { classes, state, handleNavigation } = this.props;

        return <div className={Utils.clsx(
            classes.header,
            this.props.state === STATES.opened && this.props.isSecure && classes.headerLogout,
            !this.isSwipeable() && this.props.state !== STATES.opened && classes.headerCompact,
        )}
        >
            <div className={Utils.clsx(classes.avatarBlock, state === 0 && classes.avatarVisible, classes.avatarNotVisible)}>
                <a href="/#easy" onClick={event => event.preventDefault()} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {this.props.adminGuiConfig.icon ?
                        <div style={{ height: 50, withWidth: 102, lineHeight: '50px' }}>
                            <img src={this.props.adminGuiConfig.icon} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', verticalAlign: 'middle' }} />
                        </div>
                        :
                        <Avatar
                            onClick={() => handleNavigation('easy')}
                            className={classes.logoSize}
                            alt="ioBroker"
                            src="img/no-image.png"
                        />}
                </a>
                {!this.props.adminGuiConfig.icon && this.props.versionAdmin && <Typography className={classes.styleVersion}>
v
                    {this.props.versionAdmin}
                </Typography>}
            </div>
            <IconButton
                size="large"
                onClick={() => {
                    if (this.isSwipeable() || this.props.state === STATES.compact) {
                        this.props.onStateChange(STATES.closed);
                    } else {
                        this.props.onStateChange(STATES.compact);
                    }
                }}
            >
                <ChevronLeftIcon />
            </IconButton>
        </div>;
    }

    isSwipeable() {
        return this.props.width === 'xs' || this.props.width === 'sm';
    }

    tabsEditSystemConfig = async (idx, isVisibility, color) => {
        const { tabs } = this.state;
        const { socket } = this.props;
        const newTabs = JSON.parse(JSON.stringify(tabs));
        if (isVisibility) {
            newTabs[idx].visible = !newTabs[idx].visible;
        }
        if (color !== undefined) {
            if (color === null) {
                delete newTabs[idx].color;
            } else {
                newTabs[idx].color = color;
            }
        }
        const newObjCopy = await this.props.socket.getSystemConfig(true);
        newObjCopy.common.tabsVisible = newTabs.map(({ name, visible }) => ({ name, visible }));

        if (isVisibility || color !== undefined) {
            this.setState({ tabs: newTabs }, () =>
                socket.setSystemConfig(newObjCopy)
                    .catch(e => window.alert(`Cannot set system config: ${e}`)));
        } else {
            try {
                await socket.setSystemConfig(newObjCopy);
            } catch (e) {
                window.alert(`Cannot set system config: ${e}`);
            }
        }
    };

    getNavigationItems() {
        const {
            tabs, logErrors, logWarnings,
        } = this.state;
        const {
            systemConfig, currentTab, state, classes, handleNavigation,
        } = this.props;

        if (!systemConfig) {
            return null;
        }
        return tabs.map((tab, idx) => {
            if (!this.props.editMenuList && !tab.visible) {
                return null;
            }

            if (this.props.adminGuiConfig.admin.menu && this.props.adminGuiConfig.admin.menu[tab.name] === false) {
                return null;
            }

            return <DragWrapper
                key={tab.name}
                canDrag={this.props.editMenuList}
                name={tab.name}
                iconJSX={tabsInfo[tab.name]?.icon ? tabsInfo[tab.name].icon : <Icon className={classes.icon} src={tab.icon} />}
                _id={tab.name}
                selected={currentTab === tab.name}
                tab={tab}
                compact={!this.isSwipeable() && state !== STATES.opened}
                badgeContent={logErrors || logWarnings || 0}
                badgeColor={logErrors ? 'error' : (logWarnings ? 'warn' : '')}
                tabs={tabs}
                setEndDrag={() => this.tabsEditSystemConfig()}
                setTabs={newObj => this.setState({ tabs: newObj })}
            >
                <DrawerItem
                    themeType={this.props.themeType}
                    key={tab.name}
                    editMenuList={this.props.editMenuList}
                    visible={tab.visible}
                    color={tab.color}
                    editListFunc={(isVisibility, color) => this.tabsEditSystemConfig(idx, isVisibility, color)}
                    compact={!this.isSwipeable() && state !== STATES.opened}
                    onClick={e => {
                        if (e.ctrlKey || e.shiftKey) {
                            getHref(this.props.instancesWorker, tab.name, this.props.hostname, this.props.protocol, this.props.port, this.props.hosts, this.props.adminInstance)
                                .then(href => {
                                    if (href) {
                                        console.log(href);
                                        // Open in new tab
                                        window.open(`${window.location.protocol}//${window.location.host}/${href}`, tab.name).focus();
                                    } else {
                                        handleNavigation(tab.name);
                                    }
                                });
                        } else {
                            handleNavigation(tab.name);
                        }
                    }}
                    icon={tabsInfo[tab.name]?.icon ? tabsInfo[tab.name].icon : <Icon src={tab.icon} className={classes.icon} />}
                    text={tab.title}
                    selected={currentTab === tab.name}
                    badgeContent={this.badge(tab).content}
                    badgeColor={this.badge(tab).color}
                    badgeAdditionalContent={this.badge(tab)?.additionalContent}
                    badgeAdditionalColor={this.badge(tab)?.additionalColor}
                />
            </DragWrapper>;
        });
    }

    badge = tab => {
        switch (tab.name) {
            case 'tab-logs': {
                const { logErrors, logWarnings } = this.state;
                return { content: logErrors || logWarnings || 0, color: (logErrors ? 'error' : 'warn') || '' };
            }

            case 'tab-adapters':
                return { content: this.state.adaptersUpdate || 0, color: 'primary' };

            case 'tab-hosts':
                return {
                    content: this.state.hostsUpdate || 0, color: 'primary', additionalContent: this.state.hostError, additionalColor: 'error',
                };

            default:
                return {
                    content: 0, color: '', additionalContent: 0, additionalColor: '',
                };
        }
    };

    render() {
        const { classes } = this.props;

        if (this.isSwipeable()) {
            return <SwipeableDrawer
                className={classes.root}
                anchor="left"
                open={this.props.state !== STATES.closed}
                onClose={() => this.props.onStateChange(STATES.closed)}
                onOpen={() => this.props.onStateChange(STATES.opened)}
                classes={{ paper: classes.paper }}
            >
                <CustomDragLayer />

                {this.getHeader()}

                <List>
                    {this.getNavigationItems()}
                </List>
                {this.props.isSecure &&
                    <DrawerItem
                        themeType={this.props.themeType}
                        compact={!this.isSwipeable() && this.props.state !== STATES.opened}
                        onClick={this.props.onLogout}
                        text={this.props.t('Logout')}
                        icon={<LogoutIcon />}
                    />}
                {this.props.adminGuiConfig.admin.menu.editable !== false && this.props.state === STATES.opened && <div className={this.props.classes.editButton}>
                    <CustomPopper
                        editMenuList={this.props.editMenuList}
                        onClick={() => this.props.setEditMenuList(!this.props.editMenuList)}
                    />
                </div>}
            </SwipeableDrawer>;
        }

        return <MaterialDrawer
            className={Utils.clsx(classes.root, this.props.state !== STATES.opened ? classes.rootCompactWidth : (this.props.editMenuList ? classes.rootEditWidth : classes.rootFullWidth))}
            variant="persistent"
            anchor="left"
            open={this.props.state !== STATES.closed}
            classes={{ paper: classes.paper }}
            onMouseEnter={() => this.refEditButton.current && (this.refEditButton.current.style.opacity = 1)}
            onMouseLeave={() => this.refEditButton.current && (this.refEditButton.current.style.opacity = 0)}
        >
            <CustomDragLayer />
            {this.getHeader()}
            <List className={classes.list}>
                {this.getNavigationItems()}
            </List>
            {this.props.isSecure &&
                <DrawerItem
                    themeType={this.props.themeType}
                    style={{ flexShrink: 0 }}
                    compact={!this.isSwipeable() && this.props.state !== STATES.opened}
                    onClick={this.props.onLogout}
                    text={this.props.t('Logout')}
                    icon={<LogoutIcon />}
                />}
            {this.props.adminGuiConfig.admin.menu.editable !== false && this.props.state === STATES.opened && <div
                className={this.props.classes.editButton}
                style={{ opacity: 0 }}
                ref={this.refEditButton}
            >
                <CustomPopper
                    editMenuList={this.props.editMenuList}
                    onClick={() => this.props.setEditMenuList(!this.props.editMenuList)}
                />
            </div>}
        </MaterialDrawer>;
    }
}

Drawer.propTypes = {
    t: PropTypes.func,
    lang: PropTypes.string,
    state: PropTypes.number,
    adminGuiConfig: PropTypes.object,
    onStateChange: PropTypes.func,
    onLogout: PropTypes.func,
    systemConfig: PropTypes.object,
    isSecure: PropTypes.bool,
    currentTab: PropTypes.string,
    themeType: PropTypes.string,
    socket: PropTypes.object,
    versionAdmin: PropTypes.string,
    handleNavigation: PropTypes.func,
    editMenuList: PropTypes.bool,
    setEditMenuList: PropTypes.func,

    instancesWorker: PropTypes.object,
    hostsWorker: PropTypes.object,
    logsWorker: PropTypes.object,

    hostname: PropTypes.string,
    protocol: PropTypes.string,
    port: PropTypes.number,
    adminInstance: PropTypes.string,

    installed: PropTypes.object,
    hosts: PropTypes.array,
    repository: PropTypes.object,
};

Drawer.contextType = ContextWrapper;
export default withWidth()(withStyles(styles)(Drawer));
