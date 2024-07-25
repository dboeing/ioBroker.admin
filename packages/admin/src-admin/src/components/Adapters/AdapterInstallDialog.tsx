import React, { Component } from 'react';
import semver from 'semver';

import {
    type Translate, type AdminConnection,
    type ThemeType, type IobTheme,
} from '@iobroker/adapter-react-v5';

import {
    checkCondition,
    type CompactInstanceInfo,
} from '@/dialogs/AdapterUpdateDialog';

import AddInstanceDialog, { type AdapterDependencies } from '@/dialogs/AddInstanceDialog';
import LicenseDialog from '@/dialogs/LicenseDialog';
import type { AdapterInformation } from '@iobroker/js-controller-common-db/build/esm/lib/common/tools';
import type InstancesWorker from '@/Workers/InstancesWorker';
import type HostsWorker from '@/Workers/HostsWorker';
import type { RatingDialogRepository } from '@/dialogs/RatingDialog';
import { extractUrlLink, type RepoAdapterObject } from './Utils';

export type AdapterRating = {
    rating?:           { r: number; c: number };
    [version: string]: { r: number; c: number };
};
export type AdapterRatingInfo = AdapterRating & { title: string };

export type AdapterInformationEx = AdapterInformation & { installedFrom?: string; enabled: number; count: number; ignoreVersion?: string };
export type InstalledInfo = { [adapterName: string]: AdapterInformationEx } &
    { hosts?: { [hostName: string]: (ioBroker.HostCommon & { host: string; runningVersion: string }) } };

export type AdaptersContext = {
    expertMode: boolean;
    t: Translate;
    /** current selected host */
    socket: AdminConnection;
    removeUpdateAvailable: (adapterName: string) => void;
    toggleTranslation: () => void;
    noTranslation: boolean;
    rightDependenciesFunc: (adapterName: string) => boolean;
    lang: ioBroker.Languages;
    uuid: string;
    themeType: ThemeType;
    theme: IobTheme;
    onUpdating: (isUpdating: boolean) => void;
    /** Information about ALL KNOWN adapters in the ioBroker infrastructure. Repo */
    repository: Record<string, RepoAdapterObject & { rating?: AdapterRatingInfo }>;
    /** Information about all installed adapters on this host */
    installed: InstalledInfo;
    /** Information about all installed adapters on all hosts */
    installedGlobal: InstalledInfo;
    /** very compact information about instances */
    compactInstances: Record<string, CompactInstanceInfo>;
    /** Information about installed adapters */
    adapters: Record<string, ioBroker.AdapterObject>;
    nodeJsVersion: string;
    currentHost: string;
    /** The host ID of the admin adapter, like system.host.test */
    adminHost: string;
    adminInstance: string;
    /** Current selected host */
    instancesWorker: InstancesWorker;
    hostsWorker: HostsWorker;
    executeCommand: (cmd: string, host?: string, callback?: (exitCode: number) => void) => void;
    /** node.js version of current host */
    categories: {
        name: string;
        translation: string;
        count: number;
        installed: number;
        adapters: string[];
    }[];
    descHidden: boolean;
    sortPopularFirst: boolean;
    sortRecentlyUpdated: boolean;
    isTileView: boolean;
    updateRating: (adapter: string, rating: RatingDialogRepository) => void;
    setAdminUpgradeTo: (version: string) => void;
};

export interface AdapterInstallDialogProps {
}

export interface AdapterInstallDialogState {
    showLicenseDialog: {
        url: string;
        licenseType: string;
        upload?: boolean;
        adapterName: string;
    } | null;
    addInstanceHostName: string;
    addInstanceId: string;
    addInstanceDialog: string;
    showDialog: boolean;
}

export default abstract class AdapterInstallDialog<TProps extends AdapterInstallDialogProps, TState extends AdapterInstallDialogState> extends Component<TProps, TState> {
    protected constructor(props: TProps) {
        super(props);

        this.state = {
            showDialog: false,
            showLicenseDialog: null,
            addInstanceHostName: '',
            addInstanceId: 'auto',
            addInstanceDialog: '',
        } as TState;
    }

    renderLicenseDialog(context: AdaptersContext) {
        if (!this.state.showLicenseDialog) {
            return null;
        }

        return <LicenseDialog
            licenseType={this.state.showLicenseDialog.licenseType}
            url={this.state.showLicenseDialog.url}
            onClose={result => {
                const showLicenseDialog = result ? this.state.showLicenseDialog : null;
                this.setState({ showLicenseDialog: null, showDialog: false }, () => {
                    if (showLicenseDialog) {
                        if (showLicenseDialog.upload) {
                            this.upload(showLicenseDialog.adapterName, context);
                        } else {
                            this.addInstance({ adapterName: showLicenseDialog.adapterName, context })
                                .catch(e => window.alert(`Cannot add instance: ${e}`));
                        }
                    }
                });
            }}
        />;
    }

    async addInstance(options: {
        adapterName: string;
        instance?: 'auto' | string;
        debug?: boolean;
        customUrl?: boolean;
        context: AdaptersContext;
    }): Promise<void> {
        if (!options.customUrl) {
            const adapterObject = options.context.repository[options.adapterName];

            const messages = checkCondition(
                adapterObject.messages,
                null,
                adapterObject.version,
                options.context.compactInstances,
            );

            if (!options.instance && (options.context.expertMode || messages)) {
                this.setState({
                    addInstanceDialog: options.adapterName,
                    showDialog: true,
                    addInstanceHostName: options.context.currentHost.replace(/^system\.host\./, ''),
                    addInstanceId: options.instance || 'auto',
                });
                return;
            }

            if (options.instance) {
                const instances = await options.context.instancesWorker.getInstances();
                // if the instance already exists
                if (instances && instances[`system.adapter.${options.adapterName}.${options.instance}`]) {
                    window.alert(options.context.t('Instance %s already exists', `${options.adapterName}.${options.instance}`));
                    return;
                }
            }
        }

        const host = (this.state.addInstanceHostName || options.context.currentHost).replace(/^system\.host\./, '');

        await new Promise<void>((resolve, reject) => {
            options.context.executeCommand(
                `${options.customUrl ? 'url' : 'add'} ${options.adapterName} ${options.instance ? `${options.instance} ` : ''}--host ${host} ${
                    options.debug || options.context.expertMode ? '--debug' : ''
                }`,
                host,
                exitCode => (!exitCode ? resolve() : reject(new Error(`The process returned an exit code of ${exitCode}`))),
            );
        });
    }

    getDependencies(adapterName: string, context: AdaptersContext): AdapterDependencies[] {
        const adapter = context.repository[adapterName];
        const result: AdapterDependencies[] = [];

        if (adapter) {
            if (adapter.dependencies && !Array.isArray(adapter.dependencies)) {
                adapter.dependencies = [adapter.dependencies];
            }

            if (adapter.globalDependencies && !Array.isArray(adapter.globalDependencies)) {
                adapter.globalDependencies = [adapter.globalDependencies];
            }

            const nodeVersion = adapter.node;

            if (adapter.dependencies?.length) {
                for (const dependency of adapter.dependencies) {
                    const entry: AdapterDependencies = {
                        name: '',
                        version: null,
                        installed: false,
                        installedVersion: null,
                        rightVersion: false,
                    };

                    const checkVersion = typeof dependency !== 'string';
                    const keys = Object.keys(dependency);
                    entry.name = !checkVersion ? dependency : keys ? keys[0] : null;
                    entry.version = checkVersion ? dependency[entry.name] : null;

                    if (result && entry.name) {
                        const installed = context.installed[entry.name];

                        entry.installed = !!installed;
                        entry.installedVersion = installed ? installed.version : null;
                        try {
                            entry.rightVersion = installed
                                ? checkVersion
                                    ? semver.satisfies(installed.version, entry.version, { includePrerelease: true })
                                    : true
                                : false;
                        } catch (e) {
                            entry.rightVersion = true;
                        }
                    }

                    result.push(entry);
                }
            }

            if (adapter.globalDependencies?.length) {
                for (const dependency of adapter.globalDependencies) {
                    const entry: AdapterDependencies = {
                        name: '',
                        version: null,
                        installed: false,
                        installedVersion: null,
                        rightVersion: false,
                    };

                    const checkVersion = typeof dependency !== 'string';
                    const keys = Object.keys(dependency);
                    entry.name = !checkVersion ? dependency : keys ? keys[0] : null;
                    entry.version = checkVersion ? dependency[entry.name] : null;

                    if (result && entry.name) {
                        const installed = context.installedGlobal[entry.name];

                        entry.installed = !!installed;
                        entry.installedVersion = installed ? installed.version : null;
                        try {
                            entry.rightVersion = installed
                                ? checkVersion
                                    ? semver.satisfies(installed.version, entry.version, { includePrerelease: true })
                                    : true
                                : false;
                        } catch (e) {
                            entry.rightVersion = true;
                        }
                    }

                    result.push(entry);
                }
            }

            if (nodeVersion) {
                const entry: AdapterDependencies = {
                    name: 'node',
                    version: nodeVersion,
                    installed: true,
                    installedVersion: context.nodeJsVersion,
                    rightVersion: false,
                };

                try {
                    entry.rightVersion = semver.satisfies(context.nodeJsVersion, nodeVersion);
                } catch (e) {
                    entry.rightVersion = true;
                }

                result.push(entry);
            }
        }

        return result;
    }

    renderAddInstanceDialog(context: AdaptersContext) {
        if (!this.state.addInstanceDialog) {
            return null;
        }

        return <AddInstanceDialog
            adapter={this.state.addInstanceDialog}
            socket={context.socket}
            hostsWorker={context.hostsWorker}
            instancesWorker={context.instancesWorker}
            dependencies={this.getDependencies(this.state.addInstanceDialog, context)}
            currentHost={`system.host.${this.state.addInstanceHostName}`}
            currentInstance={this.state.addInstanceId}
            t={context.t}
            onClose={(result: boolean) => {
                const addInstanceDialog = result ? this.state.addInstanceDialog : '';
                const addInstanceId = result ? this.state.addInstanceId : '';
                this.setState({
                    addInstanceDialog: '',
                    addInstanceId: 'auto',
                    showDialog: false,
                }, () => {
                    if (addInstanceDialog) {
                        this.addInstance({
                            adapterName: addInstanceDialog,
                            instance: addInstanceId,
                            context,
                        });
                    }
                });
            }}
            onHostChange={hostName => this.setState({ addInstanceHostName: hostName.replace(/^system\.host\./, '') })}
            onInstanceChange={event => this.setState({ addInstanceId: event.target.value })}
            adapterObject={context.repository[this.state.addInstanceDialog]}
            instances={context.compactInstances}
            toggleTranslation={context.toggleTranslation}
            noTranslation={context.noTranslation}
            expertMode={context.expertMode}
            theme={context.theme}
        />;
    }

    upload(adapterName: string, context: AdaptersContext) {
        context.executeCommand(`upload ${adapterName}${context.expertMode ? ' --debug' : ''}`);
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    onAddInstance(adapterName: string, context: AdaptersContext) {
        const adapter = context.repository[adapterName];
        const url = extractUrlLink(adapter);
        const licenseType = adapter.licenseInformation?.license || adapter.license;

        if (licenseType === 'MIT') {
            this.addInstance({ adapterName, context })
                .catch(e => window.alert(`Cannot add instance: ${e}`));
        } else {
            this.setState({ showLicenseDialog: { url, adapterName, licenseType }, showDialog: true });
        }
    }

    // eslint-disable-next-line react/no-unused-class-component-methods
    renderDialogs(context: AdaptersContext) {
        if (!this.state.showDialog) {
            return null;
        }

        return <>
            {this.renderAddInstanceDialog(context)}
            {this.renderLicenseDialog(context)}
        </>;
    }
}
