import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Tooltip } from '@mui/material';
import { withStyles } from '@mui/styles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { I18n, Icon, Utils } from '@iobroker/adapter-react-v5';

const styles = () => ({
    img: {
        width: 30,
        height: 30,
        margin: 'auto 0',
        position: 'relative',
        marginRight: 10,
        borderRadius: 3,
        background: '#FFFFFF',
        padding: 2,
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
    notAlive: {
        opacity: 0.3,
    },
    button: {
        maxWidth: 300,
    },
    name: {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    width: {
        width: '100%',
    },
    selector: {
        width: 15,
        display: 'inline-block',
    },
    '@media screen and (max-width: 710px)': {
        name: {
            display: 'none',
        },
        width: {
            width: 'auto',
        },
        imgButton: {
            marginRight: 0,
        },
    },
    tooltip: {
        pointerEvents: 'none',
    },
});

class HostSelectors extends Component {
    constructor(props) {
        super(props);

        this.state = {
            anchorEl: null,
            alive: {},
            hosts: [],
        };
    }

    componentDidMount() {
        this.props.socket
            .getCompactHosts(true)
            .then(hosts => {
                this.setState({ hosts }, async () => {
                    // request for all host the alive status
                    const alive = {};
                    for (let h = 0; h < hosts.length; h++) {
                        alive[hosts[h]._id] = await this.props.socket.getState(`${hosts[h]._id}.alive`);
                        if (alive[hosts[h]._id]) {
                            alive[hosts[h]._id] = !!alive[hosts[h]._id].val;
                        } else {
                            alive[hosts[h]._id] = false;
                        }
                    }
                    this.setState({ alive }, () => {
                        this.props.hostsWorker.registerHandler(this.onHostsObjectChange);
                        this.props.hostsWorker.registerAliveHandler(this.onAliveChanged);
                    });
                });
            })
            .catch(e => {
                window.alert(`Cannot get hosts: ${e}`);
            });
    }

    componentWillUnmount() {
        this.props.hostsWorker.unregisterHandler(this.onHostsObjectChange);
        this.props.hostsWorker.unregisterAliveHandler(this.onAliveChanged);
    }

    onAliveChanged = events => {
        const alive = JSON.parse(JSON.stringify(this.state.alive));
        let changed = false;
        events.forEach(event => {
            if (event.type === 'delete') {
                if (alive[event.id] !== undefined) {
                    delete alive[event.id];
                    changed = true;
                }
            } else if (!!alive[event.id] !== !!event.alive) {
                alive[event.id] = event.alive;
                changed = true;
            }
        });

        if (changed) {
            this.setState({ alive }, () => {
                if (!alive[this.props.currentHost]) {
                    const aliveHost = Object.keys(alive).find(id => alive[id]);
                    if (aliveHost) {
                        const obj = this.state.hosts.find(ob => ob._id === aliveHost);
                        if (obj) {
                            this.props.setCurrentHost(
                                obj.common?.name || aliveHost.replace('system.host.', ''),
                                aliveHost,
                            );
                        } else {
                            this.props.setCurrentHost(aliveHost.replace('system.host.', ''), aliveHost);
                        }
                    }
                }
            });
        }
    };

    onHostsObjectChange = events => {
        const hosts = JSON.parse(JSON.stringify(this.state.hosts));
        const alive = JSON.parse(JSON.stringify(this.state.alive));
        let changed = false;

        Promise.all(
            events.map(async event => {
                const host = hosts.find(it => it._id === event.id);

                if (event.type === 'delete' || !event.obj) {
                    if (host) {
                        const pos = hosts.indexOf(host);
                        if (pos !== -1) {
                            delete alive[host];
                            hosts.splice(pos);
                            changed = true;
                        }
                    }
                } else if (host) {
                    if (host.common.name !== event.obj.common?.name) {
                        host.common.name = event.obj.common?.name || '';
                        changed = true;
                    }
                    if (host.common.color !== event.obj.common?.color) {
                        host.common.color = event.obj.common?.color || '';
                        changed = true;
                    }
                    if (host.common.icon !== event.obj.common?.icon) {
                        host.common.icon = event.obj.common?.icon || '';
                        changed = true;
                    }
                } else {
                    changed = true;
                    hosts.push({
                        _id: event.id,
                        common: {
                            name: event.obj.common?.name || '',
                            color: event.obj.common?.color || '',
                            icon: event.obj.common?.icon || '',
                        },
                    });
                    const state = await this.props.socket.getState(`${event.id}.alive`);
                    alive[event.id] = state ? state.val : false;
                }
            }),
        ).then(() => {
            if (changed) {
                this.setState({ hosts, alive }, () => {
                    if (!alive[this.props.currentHost]) {
                        const aliveHost = Object.keys(alive).find(id => alive[id]);
                        if (aliveHost) {
                            const obj = this.state.hosts.find(ob => ob._id === aliveHost);
                            if (obj) {
                                this.props.setCurrentHost(
                                    obj.common?.name || aliveHost.replace('system.host.', ''),
                                    aliveHost,
                                );
                            } else {
                                this.props.setCurrentHost(aliveHost.replace('system.host.', ''), aliveHost);
                            }
                        }
                    }
                });
            }
        });
    };

    render() {
        if (!this.props.expertMode && this.state.hosts.length < 2) {
            return null;
        }
        let selectedHostObj;
        if (this.state.hosts.length) {
            selectedHostObj = this.state.hosts.find(
                host => host._id === this.props.currentHost || host._id === `system.host.${this.props.currentHost}`,
            );
        }

        return (
            <div>
                <Tooltip
                    title={this.props.tooltip || I18n.t('Change current host')}
                    classes={{ popper: this.props.classes.tooltip }}
                >
                    <span>
                        <Button
                            color={this.props.themeType === 'dark' ? 'primary' : 'secondary'}
                            className={this.props.classes.button}
                            style={{
                                background: selectedHostObj?.common?.color || 'none',
                                borderColor: selectedHostObj?.common?.color
                                    ? Utils.invertColor(selectedHostObj.common.color)
                                    : 'none',
                            }}
                            variant={this.props.disabled || this.state.hosts.length < 2 ? 'text' : 'outlined'}
                            disabled={this.props.disabled || this.state.hosts.length < 2}
                            aria-haspopup="true"
                            onClick={e => this.setState({ anchorEl: e.currentTarget })}
                        >
                            <div
                                className={Utils.clsx(
                                    this.props.classes.width,
                                    !this.state.alive[this.props.currentHost] && this.props.classes.notAlive,
                                )}
                                style={{
                                    display: 'flex',
                                    color: selectedHostObj?.common?.color
                                        ? Utils.invertColor(selectedHostObj.common.color, true)
                                        : 'none',
                                    alignItems: 'center',
                                }}
                            >
                                <Icon
                                    className={Utils.clsx(this.props.classes.img, this.props.classes.imgButton)}
                                    src={selectedHostObj?.common?.icon || 'img/no-image.png'}
                                />
                                <div className={this.props.classes.name}>{selectedHostObj?.common?.name}</div>
                            </div>
                        </Button>
                    </span>
                </Tooltip>
                <Menu
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={!!this.state.anchorEl}
                    onClose={() => this.setState({ anchorEl: null })}
                >
                    {this.state.hosts.map(({ _id, common: { name, icon, color } }, idx) => (
                        <MenuItem
                            key={_id}
                            // button
                            disabled={!this.state.alive[_id]}
                            selected={_id === this.props.currentHost}
                            style={{ background: color || 'inherit' }}
                            onClick={() => {
                                if (this.props.currentHost !== this.state.hosts[idx]._id) {
                                    this.props.setCurrentHost(
                                        this.state.hosts[idx].common.name,
                                        this.state.hosts[idx]._id,
                                    );
                                }
                                this.setState({ anchorEl: null });
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    color: (color && Utils.invertColor(color, true)) || 'inherit',
                                    alignItems: 'center',
                                }}
                            >
                                <div className={this.props.classes.selector}>
                                    {_id === this.props.currentHost ? 'ᐅ' : ''}
                                </div>
                                <Icon className={this.props.classes.img} src={icon || 'img/no-image.png'} />
                                {name}
                            </div>
                        </MenuItem>
                    ))}
                </Menu>
            </div>
        );
    }
}

HostSelectors.propTypes = {
    disabled: PropTypes.bool,
    socket: PropTypes.object,
    currentHost: PropTypes.string.isRequired,
    hostsWorker: PropTypes.object,
    expertMode: PropTypes.bool,
    setCurrentHost: PropTypes.func.isRequired,
    tooltip: PropTypes.string,
    themeType: PropTypes.string,
};

export default withStyles(styles)(HostSelectors);
