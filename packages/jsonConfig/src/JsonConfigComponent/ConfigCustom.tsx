import React, { Component } from 'react';
import { Grid, LinearProgress } from '@mui/material';

import { I18n } from '@iobroker/adapter-react-v5';

const getOrLoadRemote = (
    remote: string,
    shareScope: string,
    remoteFallbackUrl?: string,
): Promise<{get: (module: string) => () => Promise<{ default: Record<string, React.Component> }>}> =>
    new Promise((resolve, reject) => {
    // check if remote exists on the global `window`object
        if (!(window as any)[remote]) {
            // search dom to see if remote tag exists, but might still be loading (async)
            const existingRemote: HTMLScriptElement = document.querySelector(`script[data-webpack="${remote}"]`);
            // when remote is loaded.
            const onload = async () => {
                // check if it was initialized
                if ((window as any)[remote]) {
                    if (!(window as any)[remote].__initialized) {
                        // if share scope doesn't exist (like in webpack 4) then expect shareScope to be a manual object
                        // eslint-disable-next-line camelcase
                        // @ts-expect-error it is a trick and must be so
                        if (typeof __webpack_share_scopes__ === 'undefined') {
                            // use a default share scope object passed in manually
                            await (window as any)[remote].init(shareScope);
                        } else {
                            // otherwise, init share scope as usual
                            // eslint-disable-next-line
                            // @ts-expect-error it is a trick and must be so
                            await (window as any)[remote].init((__webpack_share_scopes__ as any)[shareScope]);
                        }
                        // mark remote as initialized
                        (window as any)[remote].__initialized = true;
                    }
                } else {
                    console.error(`Cannot load ${remote}`);
                    reject(new Error(`Cannot load ${remote}`));
                    return;
                }
                // resolve promise so marking remote as loaded
                resolve((window as any)[remote]);
            };

            if (existingRemote) {
                // if existing remote but not loaded, hook into its onload and wait for it to be ready
                existingRemote.onload = onload;
                existingRemote.onerror = reject;
                // check if remote fallback exists as param passed to function
                // TODO: should scan public config for a matching key if no override exists
            } else if (remoteFallbackUrl) {
                // inject remote if a fallback exists and call the same onload function
                const d = document;
                const script = d.createElement('script');
                script.type = 'text/javascript';
                // mark as data-webpack so runtime can track it internally
                script.setAttribute('data-webpack', `${remote}`);
                script.async = true;
                script.onerror = reject;
                script.onload = onload;
                script.src = remoteFallbackUrl;
                d.getElementsByTagName('head')[0].appendChild(script);
            } else {
                // no remote and no fallback exist, reject
                reject(new Error(`Cannot Find Remote ${remote} to inject`));
            }
        } else {
            // remote already instantiated, resolve
            resolve((window as any)[remote]);
        }
    });

function loadComponent(
    remote: string,
    sharedScope: string,
    module: string,
    url: string,
): () => Promise<{ default: Record<string, React.Component> }> {
    return async (): Promise<{ default: Record<string, React.Component> }> => {
        const container = await getOrLoadRemote(remote, sharedScope, url);
        const factory = await container.get(module);
        return factory();
    };
}

interface ConfigCustomSchema {
    /** location of Widget, like "custom/customComponents.js" */
    url: string;
    /** Component name, like "ConfigCustomBackItUpSet/Components/AdapterExist" */
    name: string;
    /** i18n */
    i18n: boolean | Record<string, string>;
}

interface Schema extends ConfigCustomSchema {
    /** xs */
    xs?: number;
    /** lg */
    lg?: number;
    /** md */
    md?: number;
    /** sm */
    sm?: number;
    /** style */
    style?: Record<string, any>;
    /** darkStyle */
    darkStyle?: Record<string, any>;
    /** type */
    type?: string;
    /** width */
    width?: string;
    /** newLine */
    newLine?: boolean;
    /** custom properties */
    [prop: string]: any;
}

interface ConfigCustomProps {
    socket?: any;
    themeType?: string;
    themeName?: string;
    style?: Record<string, any>;
    className?: string;
    attr?: string;
    data?: Record<string, any>;
    schema: Schema;
    onError?: (error: string) => void;
    onChange?: (
        /** new data complete with all settings */
        data: Record<string, any>,
        /** used only for custom settings (settings in object browser) */
        value?: any,
        /** indicates the end of updating */
        cb?: () => void,
        /** if true, the data will be saved in the background. `data` could be null to trigger saving */
        saveConfig?: boolean,
    ) => void;
    adapterName: string;
}

interface ConfigCustomState {
    Component: Component | null;
    error: string;
}

export default class ConfigCustom extends Component<ConfigCustomProps, ConfigCustomState> {
    static runningLoads: Record<string, Promise<{ default: Record<string, React.Component> }>> = {};

    constructor(props: ConfigCustomProps) {
        super(props);
        // schema.url - location of Widget
        // schema.name - Component name
        // schema.i18n - i18n

        this.state = {
            Component: null,
            error: '',
        };
    }

    // load component dynamically
    async componentDidMount() {
        if (!this.props.schema.url) {
            console.error('URL is empty. Cannot load custom component!');
            this.setState({ error: 'URL is empty. Cannot load custom component!' });
            return;
        }

        let url;
        /*
        if (this.props.schema.url.startsWith('http:') || this.props.schema.url.startsWith('https:')) {
            url = this.props.schema.url;
        } else
        */
        if (this.props.schema.url.startsWith('./')) {
            url = `${window.location.protocol}//${window.location.host}${this.props.schema.url.replace(/^\./, '')}`;
        } else {
            url = `${window.location.protocol}//${window.location.host}/adapter/${this.props.adapterName}/${this.props.schema.url}`;
        }
        const [uniqueName, fileToLoad, ...componentNameParts] = this.props.schema.name.split('/');
        const componentName = componentNameParts.join('/');
        if (!url) {
            console.error('Cannot find URL for custom component! Please define "url" as "custom/customComponents.js" in the schema');
            return;
        }
        if (!uniqueName || !fileToLoad || !componentName) {
            console.error('Invalid format of "name"! Please define "name" as "ConfigCustomBackItUpSet/Components/AdapterExist" in the schema');
            return;
        }
        let setPromise = ConfigCustom.runningLoads[`${url}!${fileToLoad}`];

        if (!setPromise) {
            let i18nPromise;
            if (this.props.schema.i18n === true) {
                // load i18n from files
                const pos = url.lastIndexOf('/');
                let i18nURL;
                if (pos !== -1) {
                    i18nURL = url.substring(0, pos);
                } else {
                    i18nURL = url;
                }
                const lang = I18n.getLanguage();
                const file = `${i18nURL}/i18n/${lang}.json`;

                i18nPromise = fetch(file)
                    .then(data => data.json())
                    .then(json => I18n.extendTranslations(json, lang))
                    .catch(error => {
                        if (lang !== 'en') {
                            // try to load English
                            fetch(`${i18nURL}/i18n/en.json`)
                                .then(data => data.json())
                                .then(json => I18n.extendTranslations(json, lang))
                                .catch(err => console.log(`Cannot load i18n "${file}": ${err}`));
                            return;
                        }
                        console.log(`Cannot load i18n "${file}": ${error}`);
                    });
            } else if (this.props.schema.i18n && typeof this.props.schema.i18n === 'object') {
                try {
                    I18n.extendTranslations(this.props.schema.i18n);
                } catch (error) {
                    console.error(`Cannot import i18n: ${error}`);
                }
            }
            try {
                console.log(uniqueName, fileToLoad, componentName);
                setPromise = loadComponent(uniqueName, 'default', `./${fileToLoad}`, url)();
                if (i18nPromise) {
                    setPromise = Promise.all([setPromise, i18nPromise])
                        .then(result => result[0]);
                }
                // remember promise
                ConfigCustom.runningLoads[`${url}!${fileToLoad}`] = setPromise;
            } catch (error) {
                this.setState({ error: `Cannot import from ${this.props.schema.url}: ${error}` });
            }
        }

        try {
            const component = (await setPromise).default;

            if (!component?.[componentName]) {
                const keys = Object.keys(component || {});
                console.error('URL is empty. Cannot load custom component!');
                this.setState({ error: `Component ${this.props.schema.name} not found in ${this.props.schema.url}. Found: ${keys.join(', ')}` });
            } else {
                this.setState({ Component: component[componentName] });
            }
        } catch (error) {
            this.setState({ error: `Cannot import from ${this.props.schema.url}: ${error}` });
        }
    }

    render() {
        const CustomComponent: Component = this.state.Component;

        // render temporary placeholder
        if (!CustomComponent) {
            if (this.state.error) {
                return null;
            }
            const schema = this.props.schema || {} as Schema;

            const item = <Grid
                item
                xs={schema.xs || undefined}
                lg={schema.lg || undefined}
                md={schema.md || undefined}
                sm={schema.sm || undefined}
                style={({
                    marginBottom: 0,
                    // marginRight: 8,
                    textAlign: 'left',
                    width: schema.type === 'divider' || schema.type === 'header' ? schema.width || '100%' : undefined,
                    ...schema.style,
                    ...(this.props.themeType === 'dark' ? schema.darkStyle : {}),
                })}
            >
                {this.state.error ? <div>{this.state.error}</div> : <LinearProgress />}
            </Grid>;

            if (schema.newLine) {
                return <>
                    <div style={{ flexBasis: '100%', height: 0 }} />
                    {item}
                </>;
            }
            return item;
        }

        // @ts-expect-error No idea how to solve it
        return <CustomComponent {...this.props} />;
    }
}
