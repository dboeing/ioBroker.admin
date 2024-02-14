import React, { createRef, Component } from 'react';
import { type Styles, withStyles } from '@mui/styles';
import JSON5 from 'json5';

import {
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    Paper,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

// Icons
import {
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

import {
    withWidth,
    Utils as CommonUtils,
    Error as DialogError,
    Confirm as ConfirmDialog,
} from '@iobroker/adapter-react-v5';

import { JsonConfigComponent, ConfigGeneric } from '@iobroker/json-config';
import { deepClone } from '@mui/x-data-grid/utils/utils';
import Utils from '@/Utils';
import type { BasicComponentProps, ValueOrString } from '@/types';

const styles = () => ({
    paper: {
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
    },
    headingIcon: {
        marginRight: 5,
        width: 32,
        height: 32,
    },
    titleEnabled: {
        float: 'right',
        fontSize: 16,
        color: '#7ff57f',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        paddingLeft: 20,
    },
    scrollDiv: {
        width: '100%',
        height: '100%', // `calc(100% - ${theme.mixins.toolbar.minHeight}px)`,
        overflow: 'auto',
    },
    fullWidth: {
        width: '100%',
    },
    enabledControl: {
        width: 130,
        display: 'inline-block',
        verticalAlign: 'top',
    },
    customControls: {
        width: 'calc(100% - 130px)',
        maxWidth: 800,
        display: 'inline-block',
        verticalAlign: 'top',
        paddingTop: 16,
    },

    accordionOdd: {
        // backgroundColor: 'rgba(128, 128, 128, 0.2)'
    },
    accordionEven: {
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
    },

    accordionHeaderOdd: {
        backgroundColor: 'rgba(128, 128, 128, 0.2)',
    },
    accordionHeaderEven: {
        backgroundColor: 'rgba(128, 128, 128, 0.3)',
    },

    accordionHeaderEnabledOdd: {
        backgroundColor: 'rgba(128, 255, 128, 0.2)',
    },
    accordionHeaderEnabledEven: {
        backgroundColor: 'rgba(128, 255, 128, 0.2)',
    },

    enabledVisible: {
        display: 'inline-block',
    },
    enabledInvisible: {
        display: 'none',
    },
}) satisfies Styles<any, any>;

const URL_PREFIX = '.'; // or './' or 'http://localhost:8081' for debug

interface ObjectCustomEditorProps extends BasicComponentProps {
    objects: Record<string, any>;
    /** All adapter instances which support custom attribute */
    customsInstances: string[];
    objectIDs: string[];
    registerSaveFunc: (cb?: () => void) => void;
    onProgress: (progress: boolean) => void;
    onError: (err?: unknown) => void;
    data: Record<string, any>;
    originalData: Record<string, any>;
    systemConfig: Record<string, any>;
    classes: Record<ValueOrString<keyof ReturnType<typeof styles>>, any>;
    onChange: (hasChanges?: boolean, update?: boolean) => void;
    reportChangedIds: (changedIds: string[]) => void;
}

interface ObjectCustomEditorState {
    newValues: Record<string, any>;
    loaded: boolean;
    hasChanges?: string;
    expanded: string[];
    progress?: number;
    maxOids: number;
    confirmed: boolean;
    showConfirmation: boolean;
    error?: unknown;
}

class ObjectCustomEditor extends Component<ObjectCustomEditorProps, ObjectCustomEditorState> {
    private readonly changedIds: string[];

    private readonly scrollDivRef: React.RefObject<HTMLDivElement>;

    private readonly jsonConfigs: Record<string, any>;

    private readonly refTemplate: Record<string, any>;

    private readonly customObj: ioBroker.AnyObject;

    private commonConfig: Record<string, any> = {};

    private cb?: (() => void);

    private cachedNewValues?: Record<string, any>;

    constructor(props: ObjectCustomEditorProps) {
        super(props);

        let expanded: string[] = [];
        try {
            expanded = JSON.parse((window._localStorage || window.localStorage).getItem('App.customsExpanded') || '[]');
        } catch (e) {
            expanded = [];
        }

        this.changedIds = [];

        this.state = {
            loaded: false,
            expanded,
            newValues: {},
            confirmed: false,
            showConfirmation: false,
            maxOids: 0,
        };

        this.scrollDivRef = createRef();

        this.jsonConfigs  = {};

        this.refTemplate  = {};
        this.props.customsInstances.map(id => this.refTemplate[id] = createRef());

        this.customObj = this.props.objectIDs.length > 1 ? { custom: {}, native: {} } : Utils.deepClone(this.props.objects[this.props.objectIDs[0]] || null);

        if (this.customObj) {
            this.loadAllCustoms()
                .then(() => {
                    this.commonConfig = this.getCommonConfig();
                    this.setState({ loaded: true, newValues: {} });
                });
        }
    }

    componentDidMount(): void {
        this.props.registerSaveFunc && this.props.registerSaveFunc(this.onSave);
    }

    componentWillUnmount(): void {
        this.props.registerSaveFunc && this.props.registerSaveFunc();
    }

    loadAllCustoms(): Promise<void> {
        const promises: Promise<void>[] = [];
        for (const id of this.props.customsInstances) {
            if (id === '_') {
                continue;
            }

            const adapter = id.replace(/\.\d+$/, '').replace('system.adapter.', '');
            if (this.jsonConfigs[adapter] === undefined) {
                this.jsonConfigs[adapter] = false;
                promises.push(this.getCustomTemplate(adapter));
            }
        }

        return Promise.all(promises)
            .then(() => {
                this.props.customsInstances.forEach(id => {
                    const adapter = id.replace(/\.\d+$/, '').replace('system.adapter.', '');
                    if (this.jsonConfigs[adapter]) {
                        this.jsonConfigs[adapter].instanceObjs = this.jsonConfigs[adapter].instanceObjs || {};
                        this.jsonConfigs[adapter].instanceObjs[id] = {
                            _id: id,
                            common: JSON.parse(JSON.stringify(this.props.objects[`system.adapter.${id}`]?.common)),
                            native: JSON.parse(JSON.stringify(this.props.objects[`system.adapter.${id}`]?.native)),
                        };
                    }
                });
            });
    }

    getCustomTemplate(adapter: string) {
        const ad = this.props.objects[`system.adapter.${adapter}`] ? deepClone(this.props.objects[`system.adapter.${adapter}`]) : null;

        if (!ad) {
            console.error(`Cannot find adapter "${adapter}"`);
            return Promise.resolve(null);
        }
        Utils.fixAdminUI(ad);

        if (ad.common?.adminUI.custom === 'json') {
            return this.props.socket.fileExists(`${adapter}.admin`, 'jsonCustom.json5')
                .then((exist: boolean) => {
                    if (exist) {
                        return this.props.socket.readFile(`${adapter}.admin`, 'jsonCustom.json5');
                    }
                    return this.props.socket.readFile(`${adapter}.admin`, 'jsonCustom.json');
                })
                .then((json: any) => {
                    if (json.file !== undefined) {
                        json = json.file;
                    }
                    try {
                        json = JSON5.parse(json);
                        this.jsonConfigs[adapter] = this.jsonConfigs[adapter] || {};
                        this.jsonConfigs[adapter].json = json;
                    } catch (e) {
                        console.error(`Cannot parse jsonConfig of ${adapter}: ${e}`);
                        window.alert(`Cannot parse jsonConfig of ${adapter}: ${e}`);
                    }

                    // @ts-expect-error wait for types
                    return JsonConfigComponent.loadI18n(this.props.socket, json.i18n, adapter);
                })
                .catch((e: any) => {
                    console.error(`Cannot load jsonConfig of ${adapter}: ${e}`);
                    window.alert(`Cannot load jsonConfig of ${adapter}: ${e}`);
                });
        }
        console.error(`Adapter ${adapter} is not yet supported by this version of admin`);
        window.alert(`Adapter ${adapter} is not yet supported by this version of admin`);
        return Promise.resolve(null);
    }

    // See configGeneric _executeCustom
    _executeCustom(func: string | Record<string, any>, data: Record<string, any>, customObj: Record<string, any>, instanceObj: ioBroker.InstanceObject, items: Record<string, any>, attr: string, processed: string[]) {
        if (processed.includes(attr)) {
            return undefined;
        }
        processed.push(attr);

        let alsoDependsOn: string[] = [];
        let strFunc: string;

        if (func && typeof func === 'object') {
            alsoDependsOn = func.alsoDependsOn || [];
            if (typeof alsoDependsOn === 'string') {
                alsoDependsOn = [alsoDependsOn];
            }
            strFunc = func.func;
        } else {
            strFunc = func as string;
        }

        alsoDependsOn.forEach(_attr => {
            if (!items[_attr]) {
                console.error(`[JsonConfigComponent] attribute "${_attr}" does not exist!`);
            } else if (!items[_attr].defaultFunc) {
                console.error(`[JsonConfigComponent] attribute "${_attr}" is not required to be includes in "alsoDependsOn" while has static value!`);
            } else {
                const result = this._executeCustom(items[_attr].defaultFunc, data, customObj, instanceObj, items, _attr, processed);
                if (result !== undefined) {
                    data[_attr] = result;
                }
            }
        });

        if (!strFunc) {
            data[attr] = items[attr].default === undefined ? null : items[attr].default;
        } else {
            try {
                // eslint-disable-next-line no-new-func
                const f = new Function('data', 'originalData', '_system', 'instanceObj', 'customObj', '_socket', strFunc.includes('return') ? strFunc : `return ${strFunc}`);
                data[attr] = f(data || this.props.data, this.props.originalData, this.props.systemConfig, instanceObj, customObj, this.props.socket);
            } catch (e) {
                console.error(`Cannot execute ${func}: ${e}`);
                data[attr] = !items[attr] || items[attr].default === undefined ? null : items[attr].default;
            }
        }

        return data[attr];
    }

    static flattenItems(items: Record<string, any>, _result: Record<string, any> = {}): Record<string, any> {
        items && Object.keys(items).forEach(attr => {
            if (items[attr].items) {
                ObjectCustomEditor.flattenItems(items[attr].items, _result);
            } else {
                _result[attr] = items[attr];
            }
        });

        return _result;
    }

    getDefaultValues(instance: string, obj: Record<string, any>): Record<string, any> {
        const defaultValues: Record<string, any> = { enabled: false };
        const adapter = instance.split('.')[0];

        if (this.jsonConfigs[adapter] && !this.jsonConfigs[adapter].disabled) {
            const items = ObjectCustomEditor.flattenItems(this.jsonConfigs[adapter].json.items);

            if (items) {
                const processed: string[] = [];
                const attrs = Object.keys(items).filter(attr => items[attr]);
                // first init simple defaults
                attrs.forEach(attr => {
                    if (!items[attr].defaultFunc && items[attr].default !== undefined) {
                        defaultValues[attr] = items[attr].default;
                    }
                });

                // now init default that must be calculated
                attrs.forEach(async attr => {
                    if (items[attr].defaultFunc) {
                        this._executeCustom(items[attr].defaultFunc, defaultValues, obj, this.jsonConfigs[adapter].instanceObjs[instance], items, attr, processed);
                    }
                });
            }
        }

        return defaultValues;
    }

    getCommonConfig(): Record<string, any> {
        const ids     = this.props.objectIDs || [];
        const objects = this.props.objects;

        const commons: Record<string, any> = {};

        // calculate common settings
        this.props.customsInstances.forEach(inst => {
            const adapter = inst.split('.')[0];
            if (this.jsonConfigs[adapter] && this.jsonConfigs[adapter].disabled) {
                return;
            }
            commons[inst] = {};
            ids.forEach(id => {
                const customObj = objects[id];
                const custom = customObj?.common?.custom ? customObj.common.custom[inst] || null : null;

                if (custom) {
                    Object.keys(custom).forEach(_attr => {
                        // remove all temporary values
                        if (_attr.startsWith('_')) {
                            return;
                        }
                        if (commons[inst][_attr] === undefined) {
                            commons[inst][_attr] = custom[_attr];
                        } else if (commons[inst][_attr] !== custom[_attr]) {
                            // different
                            if (!Array.isArray(commons[inst][_attr])) {
                                commons[inst][_attr] = [commons[inst][_attr]];
                            }

                            !commons[inst][_attr].includes(custom[_attr]) && commons[inst][_attr].push(custom[_attr]);
                        }
                    });
                } else {
                    // const adapter = inst.split('.')[0];
                    // Calculate defaults for this object
                    const _default = this.getDefaultValues(inst, customObj);
                    _default.enabled = false;

                    Object.keys(_default).forEach(_attr => {
                        if (_attr.startsWith('_')) {
                            return;
                        }
                        if (commons[inst][_attr] === undefined) {
                            commons[inst][_attr] = _default[_attr];
                        } else if (commons[inst][_attr] !== _default[_attr]) {
                            // different
                            if (!Array.isArray(commons[inst][_attr])) {
                                commons[inst][_attr] = [commons[inst][_attr]];
                            }

                            !commons[inst][_attr].includes(_default[_attr]) && commons[inst][_attr].push(_default[_attr]);
                        }
                    });
                }
            });

            // sort all "different" arrays
            Object.keys(commons[inst]).forEach(attr => {
                if (Array.isArray(commons[inst][attr])) {
                    commons[inst][attr].sort();
                }
            });
        });

        return commons;
    }

    isChanged(newValues: Record<string, any>): string | undefined {
        newValues = newValues || this.state.newValues;
        return Object.keys(newValues)
            .find(instance => newValues[instance] === null || (newValues[instance] && Object.keys(newValues[instance])
                .find(attr => !attr.startsWith('_'))));
    }

    combineNewAndOld(instance: string, ignoreUnderscore = false) {
        const data = { ...this.commonConfig[instance] || {}, ...this.state.newValues[instance] || {} };

        if (ignoreUnderscore) {
            Object.keys(data).forEach(attr => {
                if (attr.startsWith('_')) {
                    delete data[attr];
                }
            });
        }

        if (this.state.newValues[instance] === null) {
            data.enabled = false;
        }
        return data;
    }

    renderOneCustom(instance: string, instanceObj: ioBroker.InstanceObject, customObj: ioBroker.AnyObject, i: number) {
        const adapter = instance.split('.')[0];

        const icon = `${URL_PREFIX}/adapter/${adapter}/${this.props.objects[`system.adapter.${adapter}`].common.icon}`;
        // could be: true, false, [true, false]
        const enabled = this.state.newValues[instance] !== undefined && (!this.state.newValues[instance] || this.state.newValues[instance].enabled !== undefined) ? !!(this.state.newValues[instance] && this.state.newValues[instance].enabled) : (this.state.newValues[instance] === null ? false : this.commonConfig[instance].enabled);
        const isIndeterminate = Array.isArray(enabled) && (!this.state.newValues[instance] || this.state.newValues[instance].enabled === undefined);

        const disabled = this.jsonConfigs[adapter] && this.jsonConfigs[adapter].json?.disabled;

        const data = this.combineNewAndOld(instance);

        if (disabled && this.jsonConfigs[adapter].json.hidden === true) {
            return null;
        }

        if (typeof this.jsonConfigs[adapter].json.hidden === 'string') {
            // evaluate function
            if (this._executeCustom(this.jsonConfigs[adapter].json.hidden, data, customObj, instanceObj, this.jsonConfigs[adapter].json.items, 'enabled', [])) {
                return null;
            }
        }

        return <Accordion
            key={instance}
            id={`Accordion_${instance}`}
            className={i % 2 ? this.props.classes.accordionOdd : this.props.classes.accordionEven}
            expanded={this.state.expanded.includes(instance)}
            ref={this.refTemplate[instance]}
            onChange={() => {
                const expanded = [...this.state.expanded];
                const pos = expanded.indexOf(instance);
                if (pos === -1) {
                    expanded.push(instance);
                } else {
                    expanded.splice(pos, 1);
                }
                (window._localStorage || window.localStorage).setItem('App.customsExpanded', JSON.stringify(expanded));
                pos === -1 && (window._localStorage || window.localStorage).setItem('App.customsLastExpanded', instance);
                this.setState({ expanded });
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                data-id={instance}
                className={i % 2 ?
                    (enabled ? this.props.classes.accordionHeaderEnabledOdd : this.props.classes.accordionHeaderOdd)
                    :
                    (enabled ? this.props.classes.accordionHeaderEnabledEven : this.props.classes.accordionHeaderEven)}
            >
                <img src={icon} className={this.props.classes.headingIcon} alt="" />
                <Typography className={this.props.classes.heading}>{ this.props.t('Settings %s', instance)}</Typography>
                <div className={CommonUtils.clsx(this.props.classes.titleEnabled, 'titleEnabled', enabled ? this.props.classes.enabledVisible : this.props.classes.enabledInvisible)}>
                    {
                        this.props.t('Enabled')
                    }
                </div>
            </AccordionSummary>
            <AccordionDetails>
                <div className={this.props.classes.enabledControl}>
                    <FormControlLabel
                        className={this.props.classes.formControl}
                        control={<Checkbox
                            indeterminate={isIndeterminate}
                            checked={!!enabled}
                            disabled={disabled}
                            onChange={e => {
                                this.cachedNewValues = this.cachedNewValues || this.state.newValues;
                                const newValues = deepClone(this.cachedNewValues);

                                newValues[instance] = newValues[instance] || {};
                                if (isIndeterminate || e.target.checked) {
                                    newValues[instance].enabled = true;
                                } else if (enabled) {
                                    newValues[instance] = null;
                                } else {
                                    delete newValues[instance];
                                }
                                this.cachedNewValues = newValues;
                                this.setState({ newValues, hasChanges: this.isChanged(newValues) }, () => {
                                    this.cachedNewValues = undefined;
                                    this.props.onChange && this.props.onChange(!!this.state.hasChanges);
                                });
                            }}
                        />}
                        label={this.props.t('Enabled')}
                    />
                </div>
                <div className={this.props.classes.customControls}>
                    {!disabled && (enabled || isIndeterminate) ?
                        <JsonConfigComponent
                            instanceObj={instanceObj}
                            customObj={customObj}
                            custom
                            adapterName={adapter}
                            instance={parseInt(instance?.split('.').pop() ?? '0', 10) || 0}
                            socket={this.props.socket}
                            /** @ts-expect-error types needed */
                            theme={this.props.theme}
                            themeName={this.props.themeName}
                            themeType={this.props.themeType}
                            multiEdit={this.props.objectIDs.length > 1}
                            schema={this.jsonConfigs[adapter].json}
                            data={data}
                            onError={error =>
                                this.setState({ error }, () => this.props.onError && this.props.onError(error))}
                            onValueChange={(attr, value) => {
                                this.cachedNewValues = this.cachedNewValues || this.state.newValues;
                                console.log(`${attr} => ${value}`);
                                const newValues = deepClone(this.cachedNewValues);
                                newValues[instance] = newValues[instance] || {};
                                if (JSON.stringify(ConfigGeneric.getValue(this.commonConfig?.[instance], attr)) === JSON.stringify(value)) {
                                    ConfigGeneric.setValue(newValues[instance], attr, null);
                                    if (!Object.keys(newValues[instance]).length) {
                                        delete newValues[instance];
                                    }
                                } else {
                                    ConfigGeneric.setValue(newValues[instance], attr, value);
                                }
                                this.cachedNewValues = newValues;
                                this.setState({ newValues, hasChanges: this.isChanged(newValues) }, () => {
                                    this.cachedNewValues = undefined;
                                    this.props.onChange && this.props.onChange(!!this.state.hasChanges);
                                });
                            }}
                        /> : null}

                    {disabled && this.jsonConfigs[adapter].json.help ?
                        (typeof this.jsonConfigs[adapter].json.help === 'object' ?
                            this.jsonConfigs[adapter].json.help[this.props.lang] ||
                            this.jsonConfigs[adapter].json.help.en
                            :
                            this.props.t(this.jsonConfigs[adapter].json.help)) : null}
                </div>
            </AccordionDetails>
        </Accordion>;
    }

    renderErrorMessage() {
        // @ts-expect-error types needed
        return !!this.state.error && <DialogError
            classes={{ }}
            title={this.props.t('Error')}
            text={this.state.error}
            onClose={() => this.setState({ error: '' })}
        />;
    }

    getObject(objects: Record<string, ioBroker.AnyObject>, oldObjects: Record<string, ioBroker.AnyObject>, id: string): Record<string, any> {
        if (objects[id]) {
            return Promise.resolve(objects[id]);
        }
        return this.props.socket.getObject(id)
            .then((obj: ioBroker.AnyObject) => {
                oldObjects[id] = deepClone(obj);
                objects[id] = obj;
                return obj;
            });
    }

    saveOneState(ids: string[], cb: () => void, _objects?: any, _oldObjects?: any) {
        _objects    = _objects    || {};
        _oldObjects = _oldObjects || {};

        if (!ids?.length) {
            // save all objects
            const keys = Object.keys(_objects);
            if (!keys.length) {
                this.setState({ maxOids: 0 }, () =>
                    this.props.onProgress(false));
                cb && cb();
            } else {
                this.setState({ progress: Math.round(((this.state.maxOids - keys.length) / this.state.maxOids) * 50) + 50 });
                const id = keys.shift() as string;
                if (JSON.stringify(_objects[id].common) !== JSON.stringify(_oldObjects[id].common)) {
                    !this.changedIds.includes(id) && this.changedIds.push(id);

                    this.props.socket.setObject(id, _objects[id])
                        .then(() => {
                            delete _objects[id];
                            delete _oldObjects[id];
                            return this.props.socket.getObject(id)
                                .then((obj: ioBroker.AnyObject) => {
                                    this.props.objects[id] = obj;
                                    setTimeout(() =>
                                        this.saveOneState(ids, cb, _objects, _oldObjects), 0);
                                });
                        });
                    return;
                }
                delete _objects[id];
                delete _oldObjects[id];
                setTimeout(() =>
                    this.saveOneState(ids, cb, _objects, _oldObjects), 0);
            }
        } else {
            const maxOids = this.state.maxOids || ids.length;
            if (this.state.maxOids === null) {
                this.setState({ maxOids: ids.length }, () =>
                    this.props.onProgress(true));
            }

            // 0 - 50
            this.setState({ progress: Math.round(((maxOids - ids.length) / maxOids) * 50) });

            const id = ids.shift() as string;
            this.getObject(_objects, _oldObjects, id)
                .then((obj: Record<string, any>) => {
                    if (!obj) {
                        window.alert(`Invalid object ${id}`);
                        return;
                    }

                    // remove all disabled commons
                    if (obj.common && obj.common.custom) {
                        Object.keys(obj.common.custom).forEach(ins => {
                            if (!obj.common.custom[ins] || !obj.common.custom[ins].enabled) {
                                obj.common.custom[ins] = null;
                            }
                        });
                    }

                    const instances = Object.keys(this.state.newValues);

                    for (let i = 0; i < instances.length; i++) {
                        const instance = instances[i];
                        // const adapter = instance.split('.')[0];
                        const newValues = this.combineNewAndOld(instance, true);

                        if (newValues.enabled === false) {
                            if (obj.common && obj.common.custom && obj.common.custom[instance]) {
                                obj.common.custom[instance] = null; // here must be null and not deleted, so controller can remove it
                            }
                        } else if (newValues.enabled) {
                            obj.common = obj.common || {};
                            if (Array.isArray(newValues.enabled)) {
                                if (!obj.common.custom || !obj.common.custom[instance] || !obj.common.custom[instance].enabled) {
                                    // leave this object disabled
                                    if (obj.common.custom && obj.common.custom[instance]) {
                                        obj.common.custom[instance] = null;
                                    }
                                    continue; // instance disabled
                                }
                            }

                            obj.common.custom = obj.common.custom || {};

                            if (!obj.common.custom[instance] || !obj.common.custom[instance].enabled) {
                                // provide defaults
                                const _default = this.getDefaultValues(instance, obj);
                                obj.common.custom[instance] = JSON.parse(JSON.stringify(_default || {}));
                                // remove all temporary values
                                Object.keys(obj.common.custom[instance]).forEach(attr => {
                                    if (attr.startsWith('_')) {
                                        delete obj.common.custom[instance][attr];
                                    }
                                });
                            }

                            obj.common.custom[instance].enabled = true;

                            Object.keys(newValues).forEach(attr => {
                                // if not different
                                if (!attr.startsWith('_')) {
                                    // if (!Array.isArray(newValues[attr]) || (newValues[attr][0] && typeof newValues[attr][0] === 'object')) {
                                    obj.common.custom[instance][attr] = newValues[attr];
                                    // }
                                }
                            });
                        }
                    }

                    setTimeout(() =>
                        this.saveOneState(ids, cb, _objects, _oldObjects), 0);
                });
        }
    }

    renderConfirmationDialog() {
        if (!this.state.showConfirmation) {
            return false;
        }
        return <ConfirmDialog
            text={this.props.t('The changes will be applied to %s states. Are you sure?', this.props.objectIDs.length.toString())}
            ok={this.props.t('Yes')}
            onClose={result => {
                if (result) {
                    this.setState({ showConfirmation: false, confirmed: true }, () => {
                        const cb = this.cb;
                        this.cb = undefined;
                        this.onSave(cb);
                    });
                } else {
                    this.cb = undefined;
                    this.setState({ showConfirmation: false });
                }
            }}
        />;
    }

    onSave = (cb?: () => void): void => {
        if (this.props.objectIDs.length > 10 && !this.state.confirmed) {
            this.cb = cb;
            this.setState({ showConfirmation: true });
        } else {
            this.saveOneState([...this.props.objectIDs], () => {
                this.cachedNewValues = {};
                this.commonConfig = this.getCommonConfig();
                this.setState({ confirmed: false, hasChanges: undefined, newValues: {} }, () => {
                    this.props.reportChangedIds(this.changedIds);
                    this.props.onChange(false, true);
                    cb && setTimeout(() => cb(), 100);
                });
            });
        }
    };

    render() {
        if (this.customObj === null) {
            return <div style={{ color: '#F55', fontSize: 32 }}>
                {this.props.t('Object does not exist!')}
            </div>;
        }
        if (!this.state.loaded) {
            return <LinearProgress />;
        }
        let index = 0;

        return <Paper className={this.props.classes.paper}>
            {this.state.maxOids > 1 && <LinearProgress color="secondary" variant="determinate" value={this.state.progress} />}
            <div className={this.props.classes.scrollDiv} ref={this.scrollDivRef}>
                {this.state.maxOids === 0 && Object.values(this.jsonConfigs).map(jsonConfig => {
                    if (jsonConfig) {
                        return Object.keys(jsonConfig.instanceObjs)
                            .map(instance =>
                                this.renderOneCustom(instance, jsonConfig.instanceObjs[instance], this.customObj, index++));
                    }
                    return null;
                })}
            </div>
            {this.renderErrorMessage()}
            {this.renderConfirmationDialog()}
        </Paper>;
    }
}

export default withWidth()(withStyles(styles)(ObjectCustomEditor));
