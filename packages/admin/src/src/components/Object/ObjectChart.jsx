import { createRef, Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@mui/styles';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, TimePicker, DatePicker } from '@mui/x-date-pickers';
import {
    Paper,
    LinearProgress,
    InputLabel,
    MenuItem,
    FormControl,
    Select,
    Toolbar,
    Fab,
    Button, Menu,
} from '@mui/material';

import ReactEchartsCore from 'echarts-for-react/lib/core';

import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
    GridComponent,
    ToolboxComponent,
    TooltipComponent,
    TitleComponent,
    TimelineComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

import { Utils, withWidth } from '@iobroker/adapter-react-v5';

// icons
import { FaChartLine as SplitLineIcon } from 'react-icons/fa';
import EchartsIcon from '../../assets/echarts.png';
import { localeMap } from './utils';

echarts.use([TimelineComponent, ToolboxComponent, TitleComponent, TooltipComponent, GridComponent, LineChart, SVGRenderer]);

function padding3(ms) {
    if (ms < 10) {
        return `00${ms}`;
    } if (ms < 100) {
        return `0${ms}`;
    }
    return ms;
}

function padding2(num) {
    if (num < 10) {
        return `0${num}`;
    }
    return num;
}

const styles = theme => ({
    paper: {
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        width: '100%',
    },
    chart: {
        width: '100%',
        overflow: 'hidden',
    },
    chartWithToolbar: {
        height: `calc(100% - ${theme.mixins.toolbar.minHeight + parseInt(theme.spacing(1), 10)}px)`,
    },
    chartWithoutToolbar: {
        height: '100%',
    },
    selectHistoryControl: {
        width: 130,
    },
    selectRelativeTime: {
        marginLeft: 10,
        width: 200,
    },
    notAliveInstance: {
        opacity: 0.5,
    },
    customRange: {
        color: theme.palette.primary.main,
    },
    splitLineButtonIcon: {
        marginRight: theme.spacing(1),
    },
    grow: {
        flexGrow: 1,
    },
    toolbarDate: {
        width: 124,
        marginTop: 9,
        '& fieldset': {
            display: 'none',
        },
        '& input': {
            padding: `${theme.spacing(1)} 0 0 0`,
        },
        '& .MuiInputAdornment-root': {
            marginLeft: 0,
            marginTop: 7,
        },
    },
    toolbarTime: {
        width: 84,
        marginTop: 9,
        // marginLeft: theme.spacing(1),
        '& fieldset': {
            display: 'none',
        },
        '& input': {
            padding: `${theme.spacing(1)} 0 0 0`,
        },
        '& .MuiInputAdornment-root': {
            marginLeft: 0,
            marginTop: 7,
        },
    },
    toolbarTimeLabel: {
        position: 'absolute',
        padding: theme.spacing(1),
        fontSize: '0.8rem',
        left: 2,
        top: -9,
    },
    toolbarTimeGrid: {
        position: 'relative',
        marginLeft: theme.spacing(1),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        paddingTop: theme.spacing(0.5),
        paddingBottom: theme.spacing(0.5),
        border: '1px dotted #AAAAAA',
        borderRadius: theme.spacing(1),
        display: 'flex',
    },
    buttonIcon: {
        width: 24,
        height: 24,
    },
    echartsButton: {
        marginRight: theme.spacing(1),
        height: 34,
        width: 34,
    },
    dateInput: {
        width: 140,
        marginRight: theme.spacing(1),
    },
    timeInput: {
        width: 80,
    },
});

const GRID_PADDING_LEFT = 80;
const GRID_PADDING_RIGHT = 25;

class ObjectChart extends Component {
    constructor(props) {
        super(props);
        if (!this.props.from) {
            const from = new Date();
            from.setHours(from.getHours() - 24 * 7);
            this.start = from.getTime();
        } else {
            this.start = this.props.from;
        }
        if (!this.props.end) {
            this.end = Date.now();
        } else {
            this.end = this.props.end;
        }
        let relativeRange = (window._localStorage || window.localStorage).getItem('App.relativeRange') || '30';
        const min           = parseInt((window._localStorage || window.localStorage).getItem('App.absoluteStart'), 10) || 0;
        const max           = parseInt((window._localStorage || window.localStorage).getItem('App.absoluteEnd'), 10)   || 0;

        if ((!min || !max) && (!relativeRange || relativeRange === 'absolute')) {
            relativeRange = '30';
        }

        if (max && min) {
            relativeRange = 'absolute';
        }

        this.state = {
            historyInstance: this.props.historyInstance || '',
            historyInstances: null,
            defaultHistory: '',
            chartHeight: 300,
            chartWidth: 500,
            ampm: false,
            relativeRange,
            splitLine: (window._localStorage || window.localStorage).getItem('App.splitLine') === 'true',
            min,
            max,
            maxYLen: 0,
            stepType: '',
        };

        this.echartsReact = createRef();
        this.rangeRef     = createRef();
        this.readTimeout  = null;
        this.chartValues  = null;
        this.rangeValues  = null;

        this.unit         = this.props.obj.common && this.props.obj.common.unit ? ` ${this.props.obj.common.unit}` : '';

        this.divRef       = createRef();

        this.chart        = {};
    }

    componentDidMount() {
        this.props.socket.subscribeState(this.props.obj._id, this.onChange);
        window.addEventListener('resize', this.onResize);
        this.prepareData()
            .then(() => !this.props.noToolbar && this.readHistoryRange())
            .then(() => this.setRelativeInterval(this.state.relativeRange, true, () =>
                this.forceUpdate()));
    }

    componentWillUnmount() {
        this.readTimeout && clearTimeout(this.readTimeout);
        this.readTimeout = null;

        this.timeTimer && clearTimeout(this.timeTimer);
        this.timeTimer = null;

        this.maxYLenTimeout && clearTimeout(this.maxYLenTimeout);
        this.maxYLenTimeout = null;

        this.props.socket.unsubscribeState(this.props.obj._id, this.onChange);
        window.removeEventListener('resize', this.onResize);
    }

    onResize = () => {
        this.timerResize && clearTimeout(this.timerResize);
        this.timerResize = setTimeout(() => {
            this.timerResize = null;
            this.componentDidUpdate();
        });
    };

    onChange = (id, state) => {
        if (id === this.props.obj._id &&
            state &&
            this.rangeValues &&
            (!this.rangeValues.length || this.rangeValues[this.rangeValues.length - 1].ts < state.ts)) {
            if (!this.state.max || state.ts - this.state.max < 120_000) {
                this.chartValues && this.chartValues.push({ val: state.val, ts: state.ts });
                this.rangeValues.push({ val: state.val, ts: state.ts });

                // update only if end is near to now
                if (state.ts >= this.chart.min && state.ts <= this.chart.max + 300_000) {
                    this.updateChart();
                }
            }
        }
    };

    prepareData() {
        let list;

        if (this.props.noToolbar) {
            return new Promise(resolve => {
                this.setState({
                    // dateFormat: this.props.dateFormat.replace(/D/g, 'd').replace(/Y/g, 'y'),
                    defaultHistory: this.props.defaultHistory,
                    historyInstance: this.props.defaultHistory,
                }, () => resolve());
            });
        }

        return this.getHistoryInstances()
            .then(_list => {
                list = _list;
                // read default history
                return this.props.socket.getCompactSystemConfig();
            })
            .then(config => (!this.props.showJumpToEchart ? Promise.resolve([]) : this.props.socket.getAdapterInstances('echarts', true)
                .then(instances => {
                    // collect all echarts instances
                    const echartsJump = !!instances.find(item => item._id.startsWith('system.adapter.echarts.'));

                    const defaultHistory = config && config.common && config.common.defaultHistory;
                    // filter out history instances, that does not have data for this object
                    if (this.props.obj.common.custom) {
                        list = list.filter(it => this.props.obj.common.custom[it.id]);
                    }

                    // find current history
                    // first read from localstorage
                    let historyInstance = (window._localStorage || window.localStorage).getItem('App.historyInstance') || '';
                    if (!historyInstance || !list.find(it => it.id === historyInstance && it.alive)) {
                        // try default history
                        historyInstance = defaultHistory;
                    }
                    if (!historyInstance || !list.find(it => it.id === historyInstance && it.alive)) {
                        // find first alive history
                        historyInstance = list.find(it => it.alive);
                        if (historyInstance) {
                            historyInstance = historyInstance.id;
                        }
                    }
                    // get first entry
                    if (!historyInstance && list.length) {
                        historyInstance = defaultHistory;
                    }

                    this.setState({
                        ampm: config.common.dateFormat.includes('/'),
                        // dateFormat: (config.common.dateFormat || 'dd.MM.yyyy').replace(/D/g, 'd').replace(/Y/g, 'y'),
                        historyInstances: list,
                        defaultHistory,
                        historyInstance,
                        echartsJump,
                        stepType: this.props.obj.common.custom ? this.props.obj.common.custom[historyInstance]?.chartStep || '' : '',
                    });
                })));
    }

    getHistoryInstances() {
        const list = [];
        const ids  = [];

        if (this.props.historyInstance) {
            return Promise.resolve(list);
        }

        this.props.customsInstances.forEach(instance => {
            const instObj = this.props.objects[`system.adapter.${instance}`];
            if (instObj && instObj.common && instObj.common.getHistory) {
                const listObj = { id: instance, alive: false };
                list.push(listObj);
                ids.push(`system.adapter.${instance}.alive`);
            }
        });

        if (ids.length) {
            return this.props.socket.getForeignStates(ids)
                .then(alives => {
                    Object.keys(alives).forEach(id => {
                        const item = list.find(it => id.endsWith(`${it.id}.alive`));
                        if (item) {
                            item.alive = alives[id] && alives[id].val;
                        }
                    });
                    return list;
                });
        }
        return Promise.resolve(list);
    }

    readHistoryRange() {
        const now = new Date();
        const oldest = new Date(2000, 0, 1);

        return this.props.socket.getHistory(this.props.obj._id, {
            instance:  this.state.historyInstance,
            start:     oldest.getTime(),
            end:       now.getTime(),
            // step:      3600000, // hourly
            limit:     1,
            from:      false,
            ack:       false,
            q:         false,
            addID:     false,
            aggregate: 'none',
        })
            .then(values => {
                // remove interpolated first value
                if (values && values[0]?.val === null) {
                    values.shift();
                }
                this.rangeValues = values;
            });
    }

    readHistory(start, end) {
        /* interface GetHistoryOptions {
            instance?: string;
            start?: number;
            end?: number;
            step?: number;
            count?: number;
            from?: boolean;
            ack?: boolean;
            q?: boolean;
            addID?: boolean;
            limit?: number;
            ignoreNull?: boolean;
            sessionId?: any;
            aggregate?: 'minmax' | 'min' | 'max' | 'average' | 'total' | 'count' | 'none';
        } */
        const options = {
            instance:  this.state.historyInstance,
            start,
            end,
            from:      false,
            ack:       false,
            q:         false,
            addID:     false,
            aggregate: 'none',
            returnNewestEntries: true,
        };

        // if more than 24 hours => aggregate
        if (end - start > 60000 * 24 &&
            !(this.props.obj.common.type === 'boolean' || (this.props.obj.common.type === 'number' && this.props.obj.common.states))) {
            options.aggregate = 'minmax';
            // options.step = 60000;
        }

        return this.props.socket.getHistory(this.props.obj._id, options)
            .then(values => {
                // merge range and chart
                const chart = [];
                let r     = 0;
                const range = this.rangeValues;
                let minY  = null;
                let maxY  = null;

                for (let t = 0; t < values.length; t++) {
                    if (range) {
                        while (r < range.length && range[r].ts < values[t].ts) {
                            chart.push(range[r]);
                            // console.log(`add ${new Date(range[r].ts).toISOString()}: ${range[r].val}`);
                            r++;
                        }
                    }
                    // if range and details are not equal
                    if (!chart.length || chart[chart.length - 1].ts < values[t].ts) {
                        chart.push(values[t]);
                        // console.log(`add value ${new Date(values[t].ts).toISOString()}: ${values[t].val}`)
                    } else if (chart[chart.length - 1].ts === values[t].ts && chart[chart.length - 1].val !== values[t].ts) {
                        console.error('Strange data!');
                    }
                    if (minY === null || values[t].val < minY) {
                        minY = values[t].val;
                    }
                    if (maxY === null || values[t].val > maxY) {
                        maxY = values[t].val;
                    }
                }

                if (range) {
                    while (r < range.length) {
                        chart.push(range[r]);
                        console.log(`add range ${new Date(range[r].ts).toISOString()}: ${range[r].val}`);
                        r++;
                    }
                }

                // sort
                chart.sort((a, b) => (a.ts > b.ts ? 1 : (a.ts < b.ts ? -1 : 0)));

                this.chartValues = chart;
                this.minY = minY;
                this.maxY = maxY;

                if (this.minY < 10) {
                    this.minY = Math.round(this.minY * 10) / 10;
                } else {
                    this.minY = Math.ceil(this.minY);
                }
                if (this.maxY < 10) {
                    this.maxY = Math.round(this.maxY * 10) / 10;
                } else {
                    this.maxY = Math.ceil(this.maxY);
                }

                return chart;
            });
    }

    convertData(values) {
        values = values || this.chartValues;
        const data = [];
        if (!values.length) {
            return data;
        }
        for (let i = 0; i < values.length; i++) {
            const dp = { value: [values[i].ts, values[i].val] };
            if (values[i].i) {
                dp.exact = false;
            }
            data.push(dp);
        }
        if (!this.chart.min) {
            this.chart.min = values[0].ts;
            this.chart.max = values[values.length - 1].ts;
        }

        return data;
    }

    getOption() {
        let widthAxis;
        if (this.minY !== null && this.minY !== undefined) {
            widthAxis = (this.minY.toString() + this.unit).length * 9 + 12;
        }
        if (this.maxY !== null && this.maxY !== undefined) {
            const w = (this.maxY.toString() + this.unit).length * 9 + 12;
            if (w > widthAxis) {
                widthAxis = w;
            }
        }

        if (this.state.maxYLen) {
            const w = this.state.maxYLen * 9 + 12;
            if (w > widthAxis) {
                widthAxis = w;
            }
        }

        const serie = {
            xAxisIndex: 0,
            type: 'line',
            step: this.state.stepType === 'stepStart' ? 'start' : (this.state.stepType === 'stepMiddle' ? 'middle' : (this.state.stepType === 'stepEnd' ? 'end' : undefined)),
            showSymbol: false,
            hoverAnimation: true,
            animation: false,
            data: this.convertData(),
            lineStyle: {
                color: '#4dabf5',
            },
            areaStyle: {},
        };

        const yAxis = {
            type: 'value',
            boundaryGap: [0, '100%'],
            splitLine: {
                show: this.props.noToolbar || !!this.state.splitLine,
            },
            splitNumber: Math.round(this.state.chartHeight / 50),
            axisLabel: {
                formatter: value => {
                    let text;
                    if (this.props.isFloatComma) {
                        text = value.toString().replace(',', '.') + this.unit;
                    } else {
                        text = value + this.unit;
                    }

                    if (this.state.maxYLen < text.length) {
                        this.maxYLenTimeout && clearTimeout(this.maxYLenTimeout);
                        this.maxYLenTimeout = setTimeout(maxYLen => this.setState({ maxYLen }), 200, text.length);
                    }
                    return text;
                },
                showMaxLabel: true,
                showMinLabel: true,
            },
            axisTick: {
                alignWithLabel: true,
            },
        };

        if (this.props.obj.common.type === 'boolean') {
            serie.step = 'end';
            yAxis.axisLabel.showMaxLabel = false;
            yAxis.axisLabel.formatter = value => (value === 1 ? 'TRUE' : 'FALSE');
            yAxis.max = 1.5;
            yAxis.interval = 1;
            widthAxis = 50;
        } else
            if (this.props.obj.common.type === 'number' &&
            this.props.obj.common.states) {
                serie.step = 'end';
                yAxis.axisLabel.showMaxLabel = false;
                yAxis.axisLabel.formatter = value => (this.props.obj.common.states[value] !== undefined ? this.props.obj.common.states[value] : value);
                const keys = Object.keys(this.props.obj.common.states);
                keys.sort();
                yAxis.max = parseFloat(keys[keys.length - 1]) + 0.5;
                yAxis.interval = 1;
                let max = '';
                for (let i = 0; i < keys.length; i++) {
                    if (typeof this.props.obj.common.states[keys[i]] === 'string' && this.props.obj.common.states[keys[i]].length > max.length) {
                        max = this.props.obj.common.states[keys[i]];
                    }
                }
                widthAxis = ((max.length * 9) || 50) + 12;
            }

        const splitNumber = this.chart.withSeconds ?
            Math.round((this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT) / 100)
            :
            Math.round((this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT) / 60);

        return {
            backgroundColor: 'transparent',
            title: {
                text: this.props.noToolbar ? '' : Utils.getObjectNameFromObj(this.props.obj, this.props.lang),
                padding: [
                    10, // up
                    0,  // right
                    0,  // down
                    widthAxis ? widthAxis + 10 : GRID_PADDING_LEFT + 10, // left
                ],
            },
            grid: {
                left: widthAxis || GRID_PADDING_LEFT,
                top: 8,
                right: this.props.noToolbar ? 5 : GRID_PADDING_RIGHT,
                bottom: 40,
            },
            tooltip: {
                trigger: 'axis',
                formatter: params => {
                    params = params[0];
                    const date = new Date(params.value[0]);
                    let value = params.value[1];
                    if (value !== null && this.props.isFloatComma) {
                        value = value.toString().replace('.', ',');
                    }
                    return `${params.exact === false ? 'i' : ''}${date.toLocaleString()}.${padding3(date.getMilliseconds())}: ${value}${this.unit}`;
                },
                axisPointer: {
                    animation: true,
                },
            },
            xAxis: {
                type: 'time',
                splitLine: {
                    show: false,
                },
                splitNumber,
                min: this.chart.min,
                max: this.chart.max,
                axisTick: { alignWithLabel: true },
                axisLabel: {
                    formatter: value => {
                        const date = new Date(value);
                        if (this.chart.withSeconds) {
                            return `${padding2(date.getHours())}:${padding2(date.getMinutes())}:${padding2(date.getSeconds())}`;
                        } if (this.chart.withTime) {
                            return `${padding2(date.getHours())}:${padding2(date.getMinutes())}\n${padding2(date.getDate())}.${padding2(date.getMonth() + 1)}`;
                        }
                        return `${padding2(date.getDate())}.${padding2(date.getMonth() + 1)}\n${date.getFullYear()}`;
                    },
                },
            },
            yAxis,
            toolbox: {
                left: 'right',
                feature: this.props.noToolbar ? undefined : {
                    saveAsImage: {
                        title: this.props.t('Save as image'),
                        show: true,
                    },
                },
            },
            series: [serie],
        };
    }

    static getDerivedStateFromProps(/* props, state */) {
        return null;
    }

    updateChart(start, end, withReadData, cb) {
        if (start) {
            this.start = start;
        }
        if (end) {
            this.end = end;
        }
        start = start || this.start;
        end   = end   || this.end;

        this.readTimeout && clearTimeout(this.readTimeout);

        this.readTimeout = setTimeout(() => {
            this.readTimeout = null;

            const diff = this.chart.max - this.chart.min;
            if (diff !== this.chart.diff) {
                this.chart.diff        = diff;
                this.chart.withTime    = this.chart.diff < 3600000 * 24 * 7;
                this.chart.withSeconds = this.chart.diff < 60000 * 30;
            }

            if (withReadData) {
                this.readHistory(start, end)
                    .then(values => {
                        this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function' && this.echartsReact.getEchartsInstance().setOption({
                            series: [{ data: this.convertData(values) }],
                            xAxis: {
                                min: this.chart.min,
                                max: this.chart.max,
                            },
                        });
                        cb && cb();
                    });
            } else {
                this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function' && this.echartsReact.getEchartsInstance().setOption({
                    series: [{ data: this.convertData() }],
                    xAxis: {
                        min: this.chart.min,
                        max: this.chart.max,
                    },
                });
                cb && cb();
            }
        }, 400);
    }

    setNewRange(readData) {
        /* if (this.rangeRef.current &&
            this.rangeRef.current.childNodes[1] &&
            this.rangeRef.current.childNodes[1].value) {
            this.rangeRef.current.childNodes[0].innerHTML = '';
            this.rangeRef.current.childNodes[1].value = '';
        } */
        this.chart.diff        = this.chart.max - this.chart.min;
        this.chart.withTime    = this.chart.diff < 3600000 * 24 * 7;
        this.chart.withSeconds = this.chart.diff < 60000 * 30;

        if (this.state.relativeRange !== 'absolute') {
            this.setState({ relativeRange: 'absolute' });
            // stop shift timer
            this.timeTimer && clearTimeout(this.timeTimer);
            this.timeTimer = null;
        } else if (this.echartsReact && typeof this.echartsReact.getEchartsInstance === 'function') {
            this.echartsReact.getEchartsInstance().setOption({
                xAxis: {
                    min: this.chart.min,
                    max: this.chart.max,
                },
            });

            readData && this.updateChart(this.chart.min, this.chart.max, true);
        }
    }

    shiftTime() {
        const now = new Date();
        const delay = 60000 - now.getSeconds() - (1000 - now.getMilliseconds());

        if (now.getMilliseconds()) {
            now.setMilliseconds(1000);
        }
        if (now.getSeconds()) {
            now.setSeconds(60);
        }

        const max = now.getTime();
        let min;
        let mins = this.state.relativeRange;

        if (mins === 'day') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            min = now.getTime();
        } else if (mins === 'week') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);

            const day = now.getDay() || 7;
            if (day !== 1) {
                now.setHours(-24 * (day - 1));
            }

            min = now.getTime();
        } else if (mins === '2weeks') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(now.getDate() - 7); // 1 week earlier

            const day = now.getDay() || 7;
            if (day !== 1) {
                now.setHours(-24 * (day - 1));
            }

            min = now.getTime();
        } else if (mins === 'month') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(1);
            min = now.getTime();
        } else if (mins === 'year') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(1);
            now.setMonth(0);
            min = now.getTime();
        } else if (mins === '12months') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setFullYear(now.getFullYear() - 1);
            min = now.getTime();
        } else {
            mins = parseInt(mins, 10);
            min = max - mins * 60000;
        }

        this.chart.min = min;
        this.chart.max = max;

        this.setState({ min, max }, () =>
            this.updateChart(this.chart.min, this.chart.max, true));

        this.timeTimer = setTimeout(() => {
            this.timeTimer = null;
            this.shiftTime();
        }, delay || 60000);
    }

    setRelativeInterval(mins, dontSave, cb) {
        if (!dontSave) {
            (window._localStorage || window.localStorage).setItem('App.relativeRange', mins);
            this.setState({ relativeRange: mins });
        }
        if (mins === 'absolute') {
            this.timeTimer && clearTimeout(this.timeTimer);
            this.timeTimer = null;
            this.updateChart(this.chart.min, this.chart.max, true, cb);
            return;
        }
        (window._localStorage || window.localStorage).removeItem('App.absoluteStart');
        (window._localStorage || window.localStorage).removeItem('App.absoluteEnd');

        const now = new Date();

        if (!this.timeTimer) {
            const delay = 60000 - now.getSeconds() - (1000 - now.getMilliseconds());
            this.timeTimer = setTimeout(() => {
                this.timeTimer = null;
                this.shiftTime();
            }, delay || 60000);
        }

        if (now.getMilliseconds()) {
            now.setMilliseconds(1000);
        }
        if (now.getSeconds()) {
            now.setSeconds(60);
        }

        this.chart.max = now.getTime();

        if (mins === 'day') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            this.chart.min = now.getTime();
        } else if (mins === 'week') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);

            const day = now.getDay() || 7;
            if (day !== 1) {
                now.setHours(-24 * (day - 1));
            }

            this.chart.min = now.getTime();
        } else if (mins === '2weeks') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(now.getDate() - 7); // 1 week earlier

            const day = now.getDay() || 7;
            if (day !== 1) {
                now.setHours(-24 * (day - 1));
            }

            this.chart.min = now.getTime();
        } else if (mins === 'month') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(1);
            this.chart.min = now.getTime();
        } else if (mins === 'year') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setDate(1);
            now.setMonth(0);
            this.chart.min = now.getTime();
        } else if (mins === '12months') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            now.setFullYear(now.getFullYear() - 1);
            this.chart.min = now.getTime();
        } else {
            mins = parseInt(mins, 10);
            this.chart.min = this.chart.max - mins * 60000;
        }

        this.setState({ min: this.chart.min, max: this.chart.max }, () =>
            this.updateChart(this.chart.min, this.chart.max, true, cb));
    }

    installEventHandlers() {
        if (!this.echartsReact || typeof this.echartsReact.getEchartsInstance !== 'function') {
            return;
        }

        const zr = this.echartsReact.getEchartsInstance().getZr();
        if (!zr._iobInstalled) {
            zr._iobInstalled = true;
            zr.on('mousedown', e => {
                console.log('mouse down');
                this.mouseDown = true;
                this.chart.lastX = e.offsetX;
            });
            zr.on('mouseup', () => {
                console.log('mouse up');
                this.mouseDown = false;
                this.setNewRange(true);
            });
            zr.on('mousewheel', e => {
                let diff = this.chart.max - this.chart.min;
                const width = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;
                const x = e.offsetX - GRID_PADDING_LEFT;
                const pos = x / width;

                const oldDiff = diff;
                const amount = e.wheelDelta > 0 ? 1.1 : 0.9;
                diff *= amount;
                const move = oldDiff - diff;
                this.chart.max += move * (1 - pos);
                this.chart.min -= move * pos;

                this.setNewRange();
            });
            zr.on('mousemove', e => {
                if (this.mouseDown) {
                    const moved = this.chart.lastX - (e.offsetX - GRID_PADDING_LEFT);
                    this.chart.lastX = e.offsetX - GRID_PADDING_LEFT;
                    const diff = this.chart.max - this.chart.min;
                    const width = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                    const shift = Math.round((moved * diff) / width);
                    this.chart.min += shift;
                    this.chart.max += shift;
                    this.setNewRange();
                }
            });

            zr.on('touchstart', e => {
                e.preventDefault();
                this.mouseDown = true;
                const touches = e.touches || e.originalEvent.touches;
                if (touches) {
                    this.chart.lastX = touches[touches.length - 1].pageX;
                    if (touches.length > 1) {
                        this.chart.lastWidth = Math.abs(touches[0].pageX - touches[1].pageX);
                    } else {
                        this.chart.lastWidth = null;
                    }
                }
            });
            zr.on('touchend', e => {
                e.preventDefault();
                this.mouseDown = false;
                this.setNewRange(true);
            });
            zr.on('touchmove', e => {
                e.preventDefault();
                const touches = e.touches || e.originalEvent.touches;
                if (!touches) {
                    return;
                }
                const pageX = touches[touches.length - 1].pageX - GRID_PADDING_LEFT;
                if (this.mouseDown) {
                    if (touches.length > 1) {
                        // zoom
                        const fingerWidth = Math.abs(touches[0].pageX - touches[1].pageX);
                        if (this.chart.lastWidth !== null && fingerWidth !== this.chart.lastWidth) {
                            let diff = this.chart.max - this.chart.min;
                            const chartWidth = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                            const amount     = fingerWidth > this.chart.lastWidth ? 1.1 : 0.9;
                            const positionX  = touches[0].pageX > touches[1].pageX ?
                                touches[1].pageX - GRID_PADDING_LEFT + fingerWidth / 2 :
                                touches[0].pageX - GRID_PADDING_LEFT + fingerWidth / 2;

                            const pos = positionX / chartWidth;

                            const oldDiff = diff;
                            diff *= amount;
                            const move = oldDiff - diff;

                            this.chart.max += move * (1 - pos);
                            this.chart.min -= move * pos;

                            this.setNewRange();
                        }
                        this.chart.lastWidth = fingerWidth;
                    } else {
                        // swipe
                        const moved = this.chart.lastX - pageX;
                        const diff  = this.chart.max - this.chart.min;
                        const chartWidth = this.state.chartWidth - GRID_PADDING_RIGHT - GRID_PADDING_LEFT;

                        const shift = Math.round((moved * diff) / chartWidth);
                        this.chart.min += shift;
                        this.chart.max += shift;

                        this.setNewRange();
                    }
                }
                this.chart.lastX = pageX;
            });
        }
    }

    renderChart() {
        if (this.chartValues) {
            return <ReactEchartsCore
                ref={e => this.echartsReact = e}
                echarts={echarts}
                option={this.getOption()}
                notMerge
                lazyUpdate
                theme={this.props.themeType === 'dark' ? 'dark' : ''}
                style={{ height: `${this.state.chartHeight}px`, width: '100%' }}
                opts={{ renderer: 'svg' }}
                onEvents={{ rendered: () => this.installEventHandlers() }}
            />;
        }
        return <LinearProgress />;
    }

    componentDidUpdate() {
        if (this.divRef.current) {
            const width = this.divRef.current.offsetWidth;
            const height = this.divRef.current.offsetHeight;
            if (this.state.chartHeight !== height) { // || this.state.chartHeight !== height) {
                setTimeout(() => this.setState({ chartHeight: height, chartWidth: width }), 100);
            }
        }
    }

    setStartDate(min) {
        min = min.getTime();
        if (this.timeTimer) {
            clearTimeout(this.timeTimer);
            this.timeTimer = null;
        }
        (window._localStorage || window.localStorage).setItem('App.relativeRange', 'absolute');
        (window._localStorage || window.localStorage).setItem('App.absoluteStart', min);
        (window._localStorage || window.localStorage).setItem('App.absoluteEnd', this.state.max);

        this.chart.min = min;

        this.setState({ min, relativeRange: 'absolute' }, () =>
            this.updateChart(this.chart.min, this.chart.max, true));
    }

    setEndDate(max) {
        max = max.getTime();
        (window._localStorage || window.localStorage).setItem('App.relativeRange', 'absolute');
        (window._localStorage || window.localStorage).setItem('App.absoluteStart', this.state.min);
        (window._localStorage || window.localStorage).setItem('App.absoluteEnd', max);
        if (this.timeTimer) {
            clearTimeout(this.timeTimer);
            this.timeTimer = null;
        }
        this.chart.max = max;
        this.setState({ max, relativeRange: 'absolute'  }, () =>
            this.updateChart(this.chart.min, this.chart.max, true));
    }

    openEcharts() {
        const args = [
            `id=${window.encodeURIComponent(this.props.obj._id)}`,
            `instance=${window.encodeURIComponent(this.state.historyInstance)}`,
            'menuOpened=false',
        ];

        if (this.state.relativeRange === 'absolute') {
            args.push(`start=${this.chart.min}`);
            args.push(`end=${this.chart.max}`);
        } else {
            args.push(`range=${this.state.relativeRange}`);
        }

        window.open(`${window.location.protocol}//${window.location.host}/adapter/echarts/tab.html#${args.join('&')}`, 'echarts');
    }

    async onStepChanged(stepType) {
        // save in object
        const obj = await this.props.socket.getObject(this.props.obj._id);
        if (obj.common.custom && obj.common.custom[this.state.historyInstance] && obj.common.custom[this.state.historyInstance].chartStep !== stepType) {
            obj.common.custom[this.state.historyInstance].chartStep = stepType;
            await this.props.socket.setObject(obj._id, obj);
        }
        this.setState({ stepType, showStepMenu: null });
    }

    renderToolbar() {
        if (this.props.noToolbar) {
            return null;
        }

        const classes = this.props.classes;

        return <Toolbar>
            {!this.props.historyInstance && <FormControl variant="standard" className={classes.selectHistoryControl}>
                <InputLabel>{this.props.t('History instance')}</InputLabel>
                <Select
                    variant="standard"
                    value={this.state.historyInstance}
                    onChange={async e => {
                        (window._localStorage || window.localStorage).setItem('App.historyInstance', e.target.value);
                        this.setState({ historyInstance: e.target.value });
                    }}
                >
                    {this.state.historyInstances.map(it =>
                        <MenuItem key={it.id} value={it.id} className={Utils.clsx(!it.alive && classes.notAliveInstance)}>{it.id}</MenuItem>)}
                </Select>
            </FormControl>}
            <FormControl variant="standard" className={classes.selectRelativeTime}>
                <InputLabel>{this.props.t('Relative')}</InputLabel>
                <Select
                    variant="standard"
                    ref={this.rangeRef}
                    value={this.state.relativeRange}
                    onChange={e => this.setRelativeInterval(e.target.value)}
                >
                    <MenuItem key="custom" value="absolute" className={classes.customRange}>{this.props.t('custom range')}</MenuItem>
                    <MenuItem key="1" value={10}>{this.props.t('last 10 minutes')}</MenuItem>
                    <MenuItem key="2" value={30}>{this.props.t('last 30 minutes')}</MenuItem>
                    <MenuItem key="3" value={60}>{this.props.t('last hour')}</MenuItem>
                    <MenuItem key="4" value="day">{this.props.t('this day')}</MenuItem>
                    <MenuItem key="5" value={24 * 60}>{this.props.t('last 24 hours')}</MenuItem>
                    <MenuItem key="6" value="week">{this.props.t('this week')}</MenuItem>
                    <MenuItem key="7" value={24 * 60 * 7}>{this.props.t('last week')}</MenuItem>
                    <MenuItem key="8" value="2weeks">{this.props.t('this 2 weeks')}</MenuItem>
                    <MenuItem key="9" value={24 * 60 * 14}>{this.props.t('last 2 weeks')}</MenuItem>
                    <MenuItem key="10" value="month">{this.props.t('this month')}</MenuItem>
                    <MenuItem key="11" value={30 * 24 * 60}>{this.props.t('last 30 days')}</MenuItem>
                    <MenuItem key="12" value="year">{this.props.t('this year')}</MenuItem>
                    <MenuItem key="13" value="12months">{this.props.t('last 12 months')}</MenuItem>
                </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={localeMap[this.props.lang]}>
                <div className={classes.toolbarTimeGrid}>
                    <div
                        className={classes.toolbarTimeLabel}
                        style={this.state.relativeRange !== 'absolute' ? { opacity: 0.5 } : undefined}
                    >
                        {this.props.t('Start time')}
                    </div>
                    <DatePicker
                        className={classes.toolbarDate}
                        disabled={this.state.relativeRange !== 'absolute'}
                        value={new Date(this.state.min)}
                        onChange={date => this.setStartDate(date)}
                    />
                    <TimePicker
                        disabled={this.state.relativeRange !== 'absolute'}
                        className={classes.toolbarTime}
                        ampm={this.state.ampm}
                        value={new Date(this.state.min)}
                        onChange={date => this.setStartDate(date)}
                    />
                </div>
                <div className={classes.toolbarTimeGrid}>
                    <div
                        className={classes.toolbarTimeLabel}
                        style={this.state.relativeRange !== 'absolute' ? { opacity: 0.5 } : undefined}
                    >
                        {this.props.t('End time')}
                    </div>
                    <DatePicker
                        disabled={this.state.relativeRange !== 'absolute'}
                        className={classes.toolbarDate}
                        value={new Date(this.state.max)}
                        onChange={date => this.setEndDate(date)}
                    />
                    <TimePicker
                        disabled={this.state.relativeRange !== 'absolute'}
                        className={classes.toolbarTime}
                        ampm={this.state.ampm}
                        value={new Date(this.state.max)}
                        onChange={date => this.setEndDate(date)}
                    />
                </div>
            </LocalizationProvider>
            <div className={classes.grow} />
            <Button
                style={{ marginRight: 10 }}
                variant="outlined"
                onClick={e => this.setState({ showStepMenu: e.target })}
            >
                {this.state.stepType ? this.props.t(this.state.stepType) : this.props.t('Step type')}
            </Button>
            {this.state.showStepMenu ? <Menu
                open={!0}
                anchorEl={this.state.showStepMenu}
                onClose={() => this.setState({ showStepMenu: null })}
            >
                <MenuItem selected={this.state.stepType === ''} onClick={() => this.onStepChanged('')}>{this.props.t('None')}</MenuItem>
                <MenuItem selected={this.state.stepType === 'stepStart'} onClick={() => this.onStepChanged('stepStart')}>{this.props.t('stepStart')}</MenuItem>
            </Menu> : null}
            {this.props.showJumpToEchart && this.state.echartsJump && <Fab
                className={classes.echartsButton}
                size="small"
                onClick={() => this.openEcharts()}
                title={this.props.t('Open charts in new window')}
            >
                <img src={EchartsIcon} alt="echarts" className={classes.buttonIcon} />
            </Fab>}
            <Fab
                variant="extended"
                size="small"
                color={this.state.splitLine ? 'primary' : 'default'}
                aria-label="show lines"
                onClick={() => {
                    (window._localStorage || window.localStorage).setItem('App.splitLine', this.state.splitLine ? 'false' : 'true');
                    this.setState({ splitLine: !this.state.splitLine });
                }}
            >
                <SplitLineIcon className={classes.splitLineButtonIcon} />
                {this.props.t('Show lines')}
            </Fab>
        </Toolbar>;
    }

    render() {
        if (!this.state.historyInstances && !this.state.defaultHistory) {
            return <LinearProgress />;
        }

        return <Paper className={this.props.classes.paper}>
            {this.renderToolbar()}
            <div
                ref={this.divRef}
                className={Utils.clsx(this.props.classes.chart, this.props.noToolbar ? this.props.classes.chartWithoutToolbar : this.props.classes.chartWithToolbar)}
            >
                {this.renderChart()}
            </div>
        </Paper>;
    }
}

ObjectChart.propTypes = {
    t: PropTypes.func,
    lang: PropTypes.string,
    // expertMode: PropTypes.bool,
    socket: PropTypes.object,
    obj: PropTypes.object,
    customsInstances: PropTypes.array,
    themeType: PropTypes.string,
    objects: PropTypes.object,
    from: PropTypes.number,
    end: PropTypes.number,
    noToolbar: PropTypes.bool,
    defaultHistory: PropTypes.string,
    historyInstance: PropTypes.string,
    showJumpToEchart: PropTypes.bool,
    isFloatComma: PropTypes.bool,
};

export default withWidth()(withStyles(styles)(ObjectChart));
