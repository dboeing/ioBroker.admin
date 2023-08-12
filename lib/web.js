/* jshint -W097 */
/* jshint strict: false */
/* jslint node: true */
/* jshint -W061 */
'use strict';
const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const IoBWebServer = require('@iobroker/webserver');
const express = require('express');
const fs = require('fs');
const util = require('util');
const path = require('path');
const stream = require('stream');
const compression = require('compression');
const mime = require('mime');
const zlib = require('zlib');
const archiver = require('archiver');

let session;
let bodyParser;
let AdapterStore;
let passport;
let LocalStrategy;
let flash;
let cookieParser;
let fileUpload;
let socketIoFile;
let uuid;
const page404 = fs.readFileSync(`${__dirname}/../public/404.html`).toString('utf8');
// const FORBIDDEN_CHARS = /[\]\[*,;'"`<>\\\s?]/g; // with space
const ONE_MONTH_SEC = 30 * 24 * 3600;

// copied from here: https://github.com/component/escape-html/blob/master/index.js
const matchHtmlRegExp = /["'&<>]/;
function escapeHtml(string) {
    const str = '' + string;
    const match = matchHtmlRegExp.exec(str);

    if (!match) {
        return str;
    }

    let escape;
    let html = '';
    let index;
    let lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escape = '&quot;';
                break;
            case 38: // &
                escape = '&amp;';
                break;
            case 39: // '
                escape = '&#39;';
                break;
            case 60: // <
                escape = '&lt;';
                break;
            case 62: // >
                escape = '&gt;';
                break;
            default:
                continue;
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

function get404Page(customText) {
    if (customText) {
        return page404.replace('<div class="custom-message"></div>', `<div class="custom-message">${customText}</div>`);
    }

    return page404;
}

/**
 * Read folder recursive
 *
 * @param adapter the adapter instance
 * @param adapterName name of the adapter or dir
 * @param url url of the specific file or directory
 * @return {Promise<{ name: string, file: Buffer }[]>}
 */
async function readFolderRecursive(adapter, adapterName, url) {
    const filesOfDir = [];
    const fileMetas = await adapter.readDirAsync(adapterName, url);
    for (const fileMeta of fileMetas) {
        if (!fileMeta.isDir) {
            const file = await adapter.readFileAsync(adapterName, `${url}/${fileMeta.file}`);

            if (file.file instanceof Buffer) {
                filesOfDir.push({ name: url ? `${url}/${fileMeta.file}` : fileMeta.file, file: file.file });
            } else {
                filesOfDir.push({
                    name: url ? `${url}/${fileMeta.file}` : fileMeta.file,
                    file: Buffer.from(file.file, 'utf-8'),
                });
            }
        } else {
            filesOfDir.push(...(await readFolderRecursive(adapter, adapterName, `${url}/${fileMeta.file}`)));
        }
    }

    return filesOfDir;
}

function MemoryWriteStream() {
    stream.Transform.call(this);
    this._chunks = [];
    this._transform = (chunk, enc, cb) => {
        this._chunks.push(chunk);
        cb();
    };
    this.collect = () => {
        const result = Buffer.concat(this._chunks);
        this._chunks = [];
        return result;
    };
}
util.inherits(MemoryWriteStream, stream.Transform);

/**
 * Webserver class
 *
 * @param settings
 * @param {ioBroker.Adapter} adapter
 * @param onReady
 * @param options
 * @return {Web}
 * @constructor
 */
function Web(settings, adapter, onReady, options) {
    // todo delete after react will be main
    const LOGIN_PAGE = '/index.html?login';

    const server = {
        app: null,
        server: null,
    };

    const bruteForce = {};
    let store = null;
    let indexHTML;
    const dirName = path.normalize(`${__dirname}/../admin/`.replace(/\\/g, '/')).replace(/\\/g, '/');
    let unprotectedFiles;
    let systemLanguage = (options && options.systemLanguage) || 'en';
    let systemConfig;
    this.server = server;

    // todo delete after React will be main
    const wwwDir = 'www';

    this.close = () => {
        adapter.setState('info.connection', false, true);
        server.server && server.server.close();
    };

    this.setLanguage = lang => (systemLanguage = lang);

    function decorateLogFile(filename, text) {
        const prefix = `<html>
<head>
<style>
   table {       font-family: monospace;
       font-size: 14px;
   }
   .info {
       background: white;   }
   .type {
       font-weight: bold;   }
   .silly {
       background: #b3b3b3;   }
   .debug {
       background: lightgray;   }
   .warn {
       background: #ffdb75;       color: black;   }
   .error {
       background: #ff6a5b;   }
</style>
<script>
    function decorate (line) {
       var className = "info";
       line = line.replace(/\x1B\\[39m/g, "</span>");
       if (line.includes("[32m")) {
           className = "info";
           line = line.replace(/\x1B\\[32m/g, "<span class=\\"type\\">");
       } else 
       if (line.includes("[34m")) {
           className = "debug";
           line = line.replace(/\x1B\\[34m/g, "<span class=\\"type\\">");
       } else 
       if (line.includes("[33m")) {
           className = "warn";
           line = line.replace(/\x1B\\[33m/g, "<span class=\\"type\\">");
       } else 
       if (line.includes("[31m")) {
           className = "error";
           line = line.replace(/\x1B\\[31m/g, "<span class=\\"type\\">");
       } else 
       if (line.includes("[35m")) {
           className = "silly";
           line = line.replace(/\x1B\\[35m/g, "<span class=\\"type\\">");
       } else {
       }
       return "<tr class=\\"" + className + "\\"><td>" + line + "</td></tr>";
    }
    document.addEventListener("DOMContentLoaded", function () { 
      var text = document.body.innerHTML;
      var lines = text.split("\\n");
      text = "<table>";
      for (var i = 0; i < lines.length; i++) {
           if (lines[i]) text += decorate(lines[i]);
      }
      text += "</table>";
      document.body.innerHTML = text;
      window.scrollTo(0,document.body.scrollHeight);
    });
</script>
</head>
<body>
`;

        const suffix = '</body></html>';
        const log = text || fs.readFileSync(filename).toString();
        return prefix + log + suffix;
    }

    function prepareIndex() {
        let template = fs.readFileSync(`${__dirname}/../${wwwDir}/index.html`).toString('utf8');
        const m = template.match(/(["']?@@\w+@@["']?)/g);
        m.forEach(pattern => {
            pattern = pattern.replace(/@/g, '').replace(/'/g, '').replace(/"/g, '');
            if (pattern === 'disableDataReporting') {
                template = template.replace(
                    /['"]@@disableDataReporting@@["']/g,
                    adapter.common.disableDataReporting ? 'true' : 'false'
                );
            } else if (pattern === 'loginBackgroundImage') {
                if (adapter.config.loginBackgroundImage) {
                    template = template.replace('@@loginBackgroundImage@@', `files/${adapter.namespace}/login-bg.png`);
                } else {
                    template = template.replace('@@loginBackgroundImage@@', '');
                }
            } else if (pattern === 'loginBackgroundColor') {
                template = template.replace(
                    '@@loginBackgroundColor@@',
                    adapter.config.loginBackgroundColor || 'inherit'
                );
            } else if (pattern === 'loadingBackgroundImage') {
                if (adapter.config.loadingBackgroundImage) {
                    template = template.replace(
                        '@@loadingBackgroundImage@@',
                        `files/${adapter.namespace}/loading-bg.png`
                    );
                } else {
                    template = template.replace('@@loadingBackgroundImage@@', '');
                }
            } else if (pattern === 'loadingBackgroundColor') {
                template = template.replace('@@loadingBackgroundColor@@', adapter.config.loadingBackgroundColor || '');
            } else if (pattern === 'vendorPrefix') {
                template = template.replace(
                    `@@vendorPrefix@@`,
                    systemConfig.native.vendor.uuidPrefix || (uuid.length > 36 ? uuid.substring(0, 2) : '')
                );
            } else if (pattern === 'loginMotto') {
                template = template.replace(
                    `@@loginMotto@@`,
                    systemConfig.native.vendor.admin.login.motto || adapter.config.loginMotto || ''
                );
            } else if (pattern === 'loginLogo') {
                template = template.replace(`@@loginLogo@@`, systemConfig.native.vendor.icon || '');
            } else if (pattern === 'loginLink') {
                template = template.replace(`@@loginLink@@`, systemConfig.native.vendor.admin.login.link || '');
            } else if (pattern === 'loginTitle') {
                template = template.replace(`@@loginTitle@@`, systemConfig.native.vendor.admin.login.title || '');
            } else {
                template = template.replace(
                    `@@${pattern}@@`,
                    adapter.config[pattern] !== undefined ? adapter.config[pattern] : ''
                );
            }
        });

        return template;
    }

    function getInfoJs(/* settings */) {
        const result = [`window.sysLang = "${systemLanguage}";`];

        return result.join('\n');
    }

    function getErrorRedirect(origin) {
        // LOGIN_PAGE /index.html?login
        // origin can be "?login&href=" -
        // or "/?login&href=" -
        //
        if (origin) {
            const parts = origin.split('&');
            if (!parts.includes('error')) {
                parts.splice(1, 0, 'error');
                origin = parts.join('&');
            }
            if (origin.startsWith('?login')) {
                return LOGIN_PAGE + origin.substring(6);
            } else if (origin.startsWith('/?login')) {
                return LOGIN_PAGE + origin.substring(7);
            } else if (origin.startsWith(LOGIN_PAGE)) {
                return origin;
            } else {
                return LOGIN_PAGE + origin;
            }
        } else {
            return `${LOGIN_PAGE}?error`;
        }
    }

    function unzipFile(filename, data, res) {
        // extract the file
        try {
            const text = zlib.gunzipSync(data).toString('utf8');
            if (text.length > 2 * 1024 * 1024) {
                res.header('Content-Type', 'text/plain');
                res.send(text);
            } else {
                res.header('Content-Type', 'text/html');
                res.send(decorateLogFile(null, text));
            }
        } catch (e) {
            res.header('Content-Type', 'application/gzip');
            res.send(data);
            adapter.log.error(`Cannot extract file ${filename}: ${e}`);
        }
    }

    // settings: {
    //    "port":   8080,
    //    "auth":   false,
    //    "secure": false,
    //    "bind":   "0.0.0.0", // "::"
    //    "cache":  false
    // }
    (async function __construct() {
        if (settings.port) {
            server.app = express();
            server.app.use(compression());

            settings.ttl = parseInt(settings.ttl, 10) || 3600;
            settings.accessAllowedConfigs = settings.accessAllowedConfigs || [];
            settings.accessAllowedTabs = settings.accessAllowedTabs || [];

            server.app.disable('x-powered-by');

            // enable use of i-frames together with HTTPS
            server.app.get('/*', (req, res, next) => {
                res.header('X-Frame-Options', 'SAMEORIGIN');
                next(); // http://expressjs.com/guide.html#passing-route control
            });

            // ONLY for DEBUG
            /*server.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                next();
            });*/

            // replace socket.io
            server.app.use((req, res, next) => {
                // return favicon always
                if (req.url.endsWith('favicon.ico')) {
                    res.set('Content-Type', 'image/x-icon');
                    if (systemConfig.native.vendor.ico) {
                        // convert base64 to ico
                        const text = systemConfig.native.vendor.ico.split(',')[1];
                        return res.send(Buffer.from(text, 'base64'));
                    } else {
                        return res.send(fs.readFileSync(`${__dirname}/../${wwwDir}/favicon.ico`));
                    }
                } else if (
                    socketIoFile !== false &&
                    (req.url.startsWith('socket.io.js') || req.url.match(/\/socket\.io\.js(\?.*)?$/))
                ) {
                    if (socketIoFile) {
                        res.contentType('text/javascript');
                        return res.status(200).send(socketIoFile);
                    } else {
                        socketIoFile = fs.readFileSync(path.join(__dirname, `../${wwwDir}/lib/js/socket.io.js`));
                        if (socketIoFile) {
                            res.contentType('text/javascript');
                            return res.status(200).send(socketIoFile);
                        } else {
                            socketIoFile = false;
                            return res.status(404).send(get404Page());
                        }
                    }
                }
                next();
            });

            server.app.get('*/_socket/info.js', (req, res) => {
                res.set('Content-Type', 'application/javascript');
                res.status(200).send(getInfoJs(settings));
            });

            if (settings.auth) {
                session = require('express-session');
                cookieParser = require('cookie-parser');
                bodyParser = require('body-parser');
                AdapterStore = utils.commonTools.session(session, settings.ttl);
                passport = require('passport');
                LocalStrategy = require('passport-local').Strategy;
                flash = require('connect-flash'); // TODO report error to user

                store = new AdapterStore({ adapter });

                passport.use(
                    new LocalStrategy((username, password, done) => {
                        username = (username || '').toString();

                        if (bruteForce[username] && bruteForce[username].errors > 4) {
                            let minutes = new Date().getTime() - bruteForce[username].time;
                            if (bruteForce[username].errors < 7) {
                                if (new Date().getTime() - bruteForce[username].time < 60000) {
                                    minutes = 1;
                                } else {
                                    minutes = 0;
                                }
                            } else if (bruteForce[username].errors < 10) {
                                if (new Date().getTime() - bruteForce[username].time < 180000) {
                                    minutes = Math.ceil((180000 - minutes) / 60000);
                                } else {
                                    minutes = 0;
                                }
                            } else if (bruteForce[username].errors < 15) {
                                if (new Date().getTime() - bruteForce[username].time < 600000) {
                                    minutes = Math.ceil((600000 - minutes) / 60000);
                                } else {
                                    minutes = 0;
                                }
                            } else if (new Date().getTime() - bruteForce[username].time < 3600000) {
                                minutes = Math.ceil((3600000 - minutes) / 60000);
                            } else {
                                minutes = 0;
                            }

                            if (minutes) {
                                return done(
                                    `Too many errors. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
                                    false
                                );
                            }
                        }

                        adapter.checkPassword(username, password, (res, user) => {
                            if (!res) {
                                bruteForce[username] = bruteForce[username] || { errors: 0 };
                                bruteForce[username].time = new Date().getTime();
                                bruteForce[username].errors++;
                            } else if (bruteForce[username]) {
                                delete bruteForce[username];
                            }

                            if (res) {
                                return done(null, (user || username).replace(/^system\.user\./, ''));
                            } else {
                                return done(null, false);
                            }
                        });
                    })
                );

                passport.serializeUser((user, done) => done(null, user));

                passport.deserializeUser((user, done) => done(null, user));

                server.app.use(cookieParser());
                server.app.use(bodyParser.urlencoded({ extended: true }));
                server.app.use(bodyParser.json());
                server.app.use(
                    session({
                        secret: settings.secret,
                        saveUninitialized: true,
                        resave: true,
                        cookie: { maxAge: settings.ttl * 1000 },
                        // rolling: true, // The expiration is reset to the original maxAge, resetting the expiration countdown.
                        store,
                    })
                );
                server.app.use(passport.initialize());
                server.app.use(passport.session());
                server.app.use(flash());

                server.app.post('/login', (req, res, next) => {
                    let redirect = '/';
                    req.body = req.body || {};
                    const isDev = req.url.includes('?dev&');

                    const origin = req.body.origin || '?href=%2F';
                    if (origin) {
                        const parts = origin.match(/href=(.+)$/);
                        if (parts && parts.length > 1 && parts[1]) {
                            redirect = decodeURIComponent(parts[1]);
                            // if some invalid characters in redirect
                            if (redirect.match(/[^-_a-zA-Z0-9&%?./]/)) {
                                redirect = '/';
                            }
                        } else {
                            // extract pathname
                            redirect = origin.split('?')[0] || '/';
                        }
                    }
                    req.body.password = (req.body.password || '').toString();
                    req.body.username = (req.body.username || '').toString();
                    req.body.stayLoggedIn =
                        req.body.stayloggedin === 'true' ||
                        req.body.stayloggedin === true ||
                        req.body.stayloggedin === 'on';

                    passport.authenticate(
                        'local',
                        (err, user /* , info */) => {
                            if (err) {
                                adapter.log.warn(`Cannot login user: ${err}`);
                                return res.redirect(getErrorRedirect(origin));
                            }
                            if (!user) {
                                return res.redirect(getErrorRedirect(origin));
                            }
                            req.logIn(user, err => {
                                if (err) {
                                    adapter.log.warn(`Cannot login user: ${err}`);
                                    return res.redirect(getErrorRedirect(origin));
                                }

                                if (req.body.stayLoggedIn) {
                                    req.session.cookie.httpOnly = true;
                                    // https://www.npmjs.com/package/express-session#cookiemaxage-1
                                    // Interval in ms
                                    req.session.cookie.maxAge =
                                        (settings.ttl > ONE_MONTH_SEC ? settings.ttl : ONE_MONTH_SEC) * 1000;
                                } else {
                                    req.session.cookie.httpOnly = true;
                                    // https://www.npmjs.com/package/express-session#cookiemaxage-1
                                    // Interval in ms
                                    req.session.cookie.maxAge = settings.ttl * 1000;
                                }

                                if (isDev) {
                                    return res.redirect(`http://127.0.0.1:3000${redirect}`);
                                } else {
                                    return res.redirect(redirect);
                                }
                            });
                        } /*{
                        successRedirect: redirect,
                        failureRedirect: getErrorRedirect(origin),
                        failureFlash:    'Invalid username or password.'
                    }*/
                    )(req, res, next);
                });

                server.app.get('/session', (req, res) =>
                    res.json({ expireInSec: Math.round(req.session.cookie.maxAge / 1000) })
                );

                server.app.get('/logout', (req, res) => {
                    const isDev = req.url.includes('?dev');
                    let origin = req.url.split('origin=')[1];
                    if (origin) {
                        const pos = origin.lastIndexOf('/');
                        if (pos !== -1) {
                            origin = origin.substring(0, pos);
                        }
                    }

                    req.logout(() => {
                        if (isDev) {
                            res.redirect('http://127.0.0.1:3000/index.html?login');
                        } else {
                            res.redirect(origin ? origin + LOGIN_PAGE : LOGIN_PAGE);
                        }
                    });
                });

                // route middleware to make sure a user is logged in
                server.app.use((req, res, next) => {
                    // return favicon always
                    if (req.originalUrl.endsWith('favicon.ico')) {
                        res.set('Content-Type', 'image/x-icon');
                        if (systemConfig.native.vendor.ico) {
                            // convert base64 to ico
                            const text = systemConfig.native.vendor.ico.split(',')[1];
                            return res.send(Buffer.from(text, 'base64'));
                        } else {
                            return res.send(fs.readFileSync(`${__dirname}/../${wwwDir}/favicon.ico`));
                        }
                    } else if (/admin\.\d+\/login-bg\.png(\?.*)?$/.test(req.originalUrl)) {
                        // Read the names of files for gong
                        return adapter.readFile(adapter.namespace, 'login-bg.png', null, (err, file) => {
                            if (!err && file) {
                                res.set('Content-Type', 'image/png');
                                res.status(200).send(file);
                            } else {
                                res.status(404).send(get404Page());
                            }
                        });
                    } else if (!req.isAuthenticated()) {
                        if (/^\/login\//.test(req.originalUrl) || /\.ico(\?.*)?$/.test(req.originalUrl)) {
                            return next();
                        } else {
                            const pathName = req.url.split('?')[0];
                            // protect all paths except
                            unprotectedFiles =
                                unprotectedFiles ||
                                fs.readdirSync(path.join(__dirname, `../${wwwDir}/`)).map(file => {
                                    const stat = fs.lstatSync(path.join(__dirname, `../${wwwDir}/`, file));
                                    return { name: file, isDir: stat.isDirectory() };
                                });
                            if (
                                pathName &&
                                pathName !== '/' &&
                                !unprotectedFiles.find(file =>
                                    file.isDir ? pathName.startsWith(`/${file.name}/`) : `/${file.name}` === pathName
                                )
                            ) {
                                res.redirect(`${LOGIN_PAGE}&href=${encodeURIComponent(req.originalUrl)}`);
                            } else {
                                return next();
                            }
                        }
                    } else {
                        return next();
                    }
                });
            } else {
                server.app.get('/logout', (req, res) => res.redirect('/'));
            }

            server.app.get('/zip/*', (req, res) => {
                const parts = req.url.split('/');
                const filename = parts.pop();
                let hostname = parts.pop();
                // backwards compatibility with javascript < 3.5.5
                if (hostname === 'zip') {
                    hostname = `system.host.${adapter.host}`;
                }

                adapter.getBinaryState(`${hostname}.zip.${filename}`, (err, buff) => {
                    if (err) {
                        res.status(500).send(escapeHtml(typeof err === 'string' ? err : JSON.stringify(err)));
                    } else {
                        if (!buff) {
                            res.status(404).send(get404Page(escapeHtml(`File ${filename}.zip not found`)));
                        } else {
                            // remove file
                            adapter.delBinaryState &&
                                adapter.delBinaryState(`system.host.${adapter.host}.zip.${filename}`);
                            res.set('Content-Type', 'application/zip');
                            res.send(buff);
                        }
                    }
                });
            });

            // send log files
            server.app.get('/log/*', (req, res) => {
                let parts = decodeURIComponent(req.url).split('/');
                if (parts.length === 5) {
                    parts.shift();
                    parts.shift();
                    const [host, transport] = parts;
                    parts = parts.splice(2);
                    const filename = parts.join('/');
                    adapter.sendToHost(`system.host.${host}`, 'getLogFile', { filename, transport }, result => {
                        if (!result || result.error) {
                            res.status(404).send(get404Page(`File ${escapeHtml(filename)} not found`));
                        } else {
                            if (result.gz) {
                                if (result.size > 1024 * 1024) {
                                    res.header('Content-Type', 'application/gzip');
                                    res.send(result.data);
                                } else {
                                    try {
                                        unzipFile(filename, result.data, res);
                                    } catch (e) {
                                        res.header('Content-Type', 'application/gzip');
                                        res.send(result.data);
                                        adapter.log.error(`Cannot extract file ${filename}: ${e}`);
                                    }
                                }
                            } else if (result.data === undefined || result.data === null) {
                                res.status(404).send(get404Page(`File ${escapeHtml(filename)} not found`));
                            } else if (result.size > 2 * 1024 * 1024) {
                                res.header('Content-Type', 'text/plain');
                                res.send(result.data);
                            } else {
                                res.header('Content-Type', 'text/html');
                                res.send(decorateLogFile(null, result.data));
                            }
                        }
                    });
                } else {
                    parts = parts.splice(2);
                    const transport = parts.shift();
                    let filename = parts.join('/');
                    const config = adapter.systemConfig;

                    // detect file log
                    if (config?.log?.transport) {
                        if (transport in config.log.transport && config.log.transport[transport].type === 'file') {
                            let logFolder;
                            if (config.log.transport[transport].filename) {
                                parts = config.log.transport[transport].filename.replace(/\\/g, '/').split('/');
                                parts.pop();
                                logFolder = path.normalize(parts.join('/'));
                            } else {
                                logFolder = path.join(process.cwd(), 'log');
                            }

                            if (logFolder[0] !== '/' && logFolder[0] !== '\\' && !logFolder.match(/^[a-zA-Z]:/)) {
                                const _logFolder = path
                                    .normalize(path.join(`${__dirname}/../../../`, logFolder).replace(/\\/g, '/'))
                                    .replace(/\\/g, '/');
                                if (!fs.existsSync(_logFolder)) {
                                    logFolder = path
                                        .normalize(path.join(`${__dirname}/../../`, logFolder).replace(/\\/g, '/'))
                                        .replace(/\\/g, '/');
                                } else {
                                    logFolder = _logFolder;
                                }
                            }

                            filename = path
                                .normalize(path.join(logFolder, filename).replace(/\\/g, '/'))
                                .replace(/\\/g, '/');

                            if (filename.startsWith(logFolder) && fs.existsSync(filename)) {
                                const stat = fs.lstatSync(filename);
                                // if file is archive
                                if (filename.toLowerCase().endsWith('.gz')) {
                                    // try to not process to big files
                                    if (stat.size > 1024 * 1024 /* || !fs.existsSync('/dev/null')*/) {
                                        res.header('Content-Type', 'application/gzip');
                                        res.sendFile(filename);
                                    } else {
                                        try {
                                            unzipFile(filename, fs.readFileSync(filename), res);
                                        } catch (e) {
                                            res.header('Content-Type', 'application/gzip');
                                            res.sendFile(filename);
                                            adapter.log.error(`Cannot extract file ${filename}: ${e}`);
                                        }
                                    }
                                } else if (stat.size > 2 * 1024 * 1024) {
                                    res.header('Content-Type', 'text/plain');
                                    res.sendFile(filename);
                                } else {
                                    res.header('Content-Type', 'text/html');
                                    res.send(decorateLogFile(filename));
                                }

                                return;
                            }
                        }
                    }

                    res.status(404).send(get404Page(`File ${escapeHtml(filename)} not found`));
                }
            });

            const appOptions = {};
            if (settings.cache) {
                appOptions.maxAge = 30758400000;
            }

            if (settings.tmpPathAllow && settings.tmpPath) {
                server.app.use('/tmp/', express.static(settings.tmpPath, { maxAge: 0 }));
                fileUpload = fileUpload || require('express-fileupload');
                server.app.use(
                    fileUpload({
                        useTempFiles: true,
                        tempFileDir: settings.tmpPath,
                    })
                );
                server.app.post('/upload', (req, res) => {
                    if (!req.files) {
                        return res.status(400).send('No files were uploaded.');
                    }

                    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
                    let myFile;
                    // take first non-empty file
                    for (const file of Object.values(req.files)) {
                        myFile = file;
                        break;
                    }

                    if (myFile) {
                        if (myFile.data && myFile.data.length > 600 * 1024 * 1024) {
                            return res.status(500).send('File is too big. (Max 600MB)');
                        }
                        // Use the mv() method to place the file somewhere on your server
                        myFile.mv(`${settings.tmpPath}/restore.iob`, err => {
                            if (err) {
                                res.status(500).send(escapeHtml(typeof err === 'string' ? err : JSON.stringify(err)));
                            } else {
                                res.send('File uploaded!');
                            }
                        });
                    } else {
                        return res.status(500).send('File not uploaded');
                    }
                });
            }

            if (!fs.existsSync(`${__dirname}/../${wwwDir}`)) {
                server.app.use('/', (req, res) =>
                    res.send(
                        'This adapter cannot be installed directly from GitHub.<br>You must install it from npm.<br>Write for that <i>"npm install iobroker.admin"</i> in according directory.'
                    )
                );
            } else {
                server.app.get('/empty.html', (req, res) => res.send(''));

                server.app.get('/index.html', (req, res) => {
                    indexHTML = indexHTML || prepareIndex();
                    res.header('Content-Type', 'text/html');
                    res.status(200).send(indexHTML);
                });
                server.app.get('/', (req, res) => {
                    indexHTML = indexHTML || prepareIndex();
                    res.header('Content-Type', 'text/html');
                    res.status(200).send(indexHTML);
                });

                server.app.use('/', express.static(`${__dirname}/../${wwwDir}`, appOptions));
            }

            // reverse proxy with url rewrite for couchdb attachments in <adapter-name>.admin
            server.app.use('/adapter/', (req, res) => {
                // Example: /example/?0&attr=1
                let url;
                try {
                    url = decodeURIComponent(req.url);
                } catch (e) {
                    // ignore
                    url = req.url;
                }

                // add index.html
                url = url.replace(/\/($|\?|#)/, '/index.html$1');

                // Read config files for admin from /adapters/admin/admin/...
                if (url.startsWith(`/${adapter.name}/`)) {
                    url = url.replace(`/${adapter.name}/`, dirName);
                    // important: Linux does not normalize "\" but fs.readFile accepts it as '/'
                    url = path.normalize(url.replace(/\?.*/, '').replace(/\\/g, '/')).replace(/\\/g, '/');

                    if (url.startsWith(dirName)) {
                        try {
                            if (fs.existsSync(url)) {
                                res.contentType(mime.getType(url) || 'text/javascript');
                                fs.createReadStream(url).pipe(res);
                            } else {
                                res.status(404).send(get404Page(`File not found`));
                            }
                        } catch (e) {
                            res.status(404).send(get404Page(`File not found: ${escapeHtml(JSON.stringify(e))}`));
                        }
                    } else {
                        res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                    }
                    return;
                }

                url = url.split('/');
                // Skip first /
                url.shift();
                // Get ID
                const adapterName = url.shift();
                const id = `${adapterName}.admin`;
                url = url.join('/');
                const pos = url.indexOf('?');
                let _instance = 0;
                if (pos !== -1) {
                    _instance = parseInt(url.substring(pos + 1), 10) || 0;
                    url = url.substring(0, pos);
                }

                if (settings.accessLimit) {
                    if (url === 'index.html' || url === 'index_m.html') {
                        const anyConfig = settings.accessAllowedConfigs.includes(`${adapterName}.${_instance}`);
                        if (!anyConfig) {
                            res.contentType('text/html');
                            return res.status(403).send('You are not allowed to access this page');
                        }
                    }
                    if (url === 'tab.html' || url === 'tab_m.html') {
                        const anyTabs = settings.accessAllowedTabs.includes(`${adapterName}.${_instance}`);
                        if (!anyTabs) {
                            res.contentType('text/html');
                            return res.status(403).send('You are not allowed to access this page');
                        }
                    }
                }

                // adapter.readFile is sanitized
                adapter.readFile(id, url, null, (err, buffer, mimeType) => {
                    if (!buffer || err) {
                        res.contentType('text/html');
                        res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                    } else {
                        if (mimeType) {
                            res.contentType(mimeType['content-type'] || mimeType);
                        } else {
                            try {
                                const _mimeType = mime.getType(url);
                                res.contentType(_mimeType || 'text/javascript');
                            } catch (error) {
                                res.contentType('text/javascript');
                            }
                        }
                        res.send(buffer);
                    }
                });
            });

            // reverse proxy with url rewrite for couchdb attachments in <adapter-name>
            server.app.use('/files/', async (req, res) => {
                // Example: /vis.0/main/img/image.png
                let url;
                try {
                    url = decodeURIComponent(req.url);
                } catch (e) {
                    // ignore
                    url = req.url;
                }

                // add index.html
                url = url.replace(/\/($|\?|#)/, '/index.html$1');

                url = url.split('/');
                // Skip first /files
                url.shift();
                // Get ID
                const adapterName = url.shift();
                url = url.join('/');
                const pos = url.indexOf('?');
                let _instance = 0;
                if (pos !== -1) {
                    _instance = parseInt(url.substring(pos + 1), 10) || 0;
                    url = url.substring(0, pos);
                }

                if (settings.accessLimit) {
                    if (url === 'index.html' || url === 'index_m.html') {
                        const anyConfig = settings.accessAllowedConfigs.includes(`${adapterName}.${_instance}`);
                        if (!anyConfig) {
                            res.contentType('text/html');
                            return res.status(403).send('You are not allowed to access this page');
                        }
                    }
                    if (url === 'tab.html' || url === 'tab_m.html') {
                        const anyTabs = settings.accessAllowedTabs.includes(`${adapterName}.${_instance}`);
                        if (!anyTabs) {
                            res.contentType('text/html');
                            return res.status(403).send('You are not allowed to access this page');
                        }
                    }
                }

                try {
                    if (await adapter.fileExists(adapterName, url)) {
                        const { mimeType, file } = await adapter.readFileAsync(adapterName, url);

                        if (mimeType) {
                            res.contentType(mimeType['content-type'] || mimeType);
                        } else {
                            res.contentType('text/javascript');
                        }

                        if (adapterName === adapter.namespace && url.startsWith('zip/')) {
                            // special files, that can be read only one time
                            adapter.unlink(adapterName, url, () => {});
                        }

                        res.send(file);
                    } else {
                        const filesOfDir = await readFolderRecursive(adapter, adapterName, url);

                        const archive = archiver('zip', {
                            zlib: { level: 9 },
                        });

                        // const zip = zlib.gzipSync(filesOfDir)
                        for (const file of filesOfDir) {
                            archive.append(file.file, { name: file.name });
                        }

                        const zip = [];

                        archive.on('data', chunk => zip.push(chunk));

                        await archive.finalize();

                        res.contentType('application/zip');
                        res.send(Buffer.concat(zip));
                    }
                } catch (e) {
                    adapter.log.error(e.message);
                    res.contentType('text/html');
                    res.status(404).send(get404Page(`File ${escapeHtml(url)} not found`));
                }
            });

            // handler for oauth2 redirects
            server.app.use('/oauth2_callbacks/', (req, res) => {
                // extract instance from "http://localhost:8081/oauth2_callbacks/netatmo.0/?state=ABC&code=CDE"
                const [_instance, params] = req.url.split('?');
                const instance = _instance.replace(/^\//, '').replace(/\/$/, ''); // remove last and first "/" in "/netatmo.0/"
                const query = {};
                params.split('&').forEach(param => {
                    const [key, value] = param.split('=');
                    query[key] = value === undefined ? true : value;
                    if (Number.isFinite(query[key])) {
                        query[key] = parseFloat(query[key]);
                    } else if (query[key] === 'true') {
                        query[key] = true;
                    } else if (query[key] === 'false') {
                        query[key] = false;
                    }
                });

                if (query.timeout > 30000) {
                    query.timeout = 30000;
                }

                let timeout = setTimeout(() => {
                    if (timeout) {
                        timeout = null;
                        let text = fs.readFileSync(`${__dirname}/../public/oauthError.html`).toString('utf8');
                        text = text.replace('%LANGUAGE%', systemLanguage);
                        text = text.replace('%ERROR%', 'TIMEOUT');
                        res.setHeader('Content-Type', 'text/html');
                        res.status(408).send(text);
                    }
                }, query.timeout || 5000);

                adapter.sendTo(instance, 'oauth2Callback', query, result => {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                        if (result && result.error) {
                            let text = fs.readFileSync(`${__dirname}/../public/oauthError.html`).toString('utf8');
                            text = text.replace('%LANGUAGE%', systemLanguage);
                            text = text.replace('%ERROR%', result.error);
                            res.setHeader('Content-Type', 'text/html');
                            res.status(500).send(text);
                        } else {
                            let text = fs.readFileSync(`${__dirname}/../public/oauthSuccess.html`).toString('utf8');
                            text = text.replace('%LANGUAGE%', systemLanguage);
                            text = text.replace('%MESSAGE%', result ? result.result || '' : '');
                            res.setHeader('Content-Type', 'text/html');
                            res.status(200).send(text);
                        }
                    }
                });
            });

            // 404 handler
            server.app.use((req, res) => res.status(404).send(get404Page(`File ${escapeHtml(req.url)} not found`)));

            try {
                const webserver = new IoBWebServer.WebServer({ app: server.app, adapter, secure: settings.secure });
                server.server = await webserver.init();
            } catch (err) {
                adapter.log.error(`Cannot create web-server: ${err}`);
                adapter.terminate
                    ? adapter.terminate(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION)
                    : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                return;
            }
            if (!server.server) {
                adapter.log.error(`Cannot create web-server`);
                adapter.terminate
                    ? adapter.terminate(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION)
                    : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                return;
            }

            server.server.__server = server;
        } else {
            adapter.log.error('port missing');
            adapter.terminate
                ? adapter.terminate('port missing', utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION)
                : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
        }

        adapter
            .getForeignObjectAsync('system.config')
            .then(obj => {
                systemConfig = obj || {};
                systemConfig.native = systemConfig.native || {};
                systemConfig.native.vendor = systemConfig.native.vendor || {};
                systemConfig.native.vendor.admin = systemConfig.native.vendor.admin || {};
                systemConfig.native.vendor.admin.login = systemConfig.native.vendor.admin.login || {};

                return adapter.getForeignObjectAsync('system.meta.uuid');
            })
            .then(obj => {
                if (obj && obj.native) {
                    uuid = obj.native.uuid;
                }

                if (server.server) {
                    let serverListening = false;
                    let serverPort;
                    server.server.on('error', e => {
                        if (e.toString().includes('EACCES') && serverPort <= 1024) {
                            adapter.log.error(
                                `node.js process has no rights to start server on the port ${serverPort}.\n` +
                                    `Do you know that on linux you need special permissions for ports under 1024?\n` +
                                    `You can call in shell following scrip to allow it for node.js: "iobroker fix"`
                            );
                        } else {
                            adapter.log.error(
                                `Cannot start server on ${settings.bind || '0.0.0.0'}:${serverPort}: ${e}`
                            );
                        }

                        if (!serverListening) {
                            adapter.terminate
                                ? adapter.terminate(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION)
                                : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                        }
                    });

                    settings.port = parseInt(settings.port, 10) || 8081;
                    serverPort = settings.port;

                    adapter.getPort(
                        settings.port,
                        !settings.bind || settings.bind === '0.0.0.0' ? undefined : settings.bind || undefined,
                        port => {
                            if (port !== settings.port && !adapter.config.findNextPort) {
                                adapter.log.error(`port ${settings.port} already in use`);
                                return adapter.terminate
                                    ? adapter.terminate(
                                          `port ${settings.port} already in use`,
                                          utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION
                                      )
                                    : process.exit(utils.EXIT_CODES.ADAPTER_REQUESTED_TERMINATION);
                            }
                            serverPort = port;

                            // Start the web server
                            server.server.listen(
                                port,
                                !settings.bind || settings.bind === '0.0.0.0' ? undefined : settings.bind || undefined,
                                () => {
                                    adapter.setState('info.connection', true, true);
                                    serverListening = true;
                                    adapter.log.info(
                                        `http${settings.secure ? 's' : ''} server listening on port ${port}`
                                    );
                                    adapter.log.info(
                                        `Use link "http${settings.secure ? 's' : ''}://127.0.0.1:${port}" to configure.`
                                    );
                                }
                            );

                            if (typeof onReady === 'function') {
                                onReady(server.server, store, adapter);
                            }
                        }
                    );
                }
            });

        if (server.server) {
            return server;
        } else {
            return null;
        }
    })();

    return this;
}

module.exports = Web;
