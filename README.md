![Logo](admin/admin.png)
# ioBroker.admin

![Number of Installations](http://iobroker.live/badges/admin-installed.svg)
![Number of Installations](http://iobroker.live/badges/admin-stable.svg)
[![NPM version](http://img.shields.io/npm/v/iobroker.admin.svg)](https://www.npmjs.com/package/iobroker.admin)

![Test and Release](https://github.com/ioBroker/ioBroker.admin/workflows/Test%20and%20Release/badge.svg)
[![Translation status](https://weblate.iobroker.net/widgets/adapters/-/admin/svg-badge.svg)](https://weblate.iobroker.net/engage/adapters/?utm_source=widget)
[![Downloads](https://img.shields.io/npm/dm/iobroker.admin.svg)](https://www.npmjs.com/package/iobroker.admin)

User interface for configuration and administration of ioBroker.

**This adapter uses Sentry libraries to automatically report exceptions and code errors to the developers.** For more details and for information how to disable the error reporting see [Sentry-Plugin Documentation](https://github.com/ioBroker/plugin-sentry#plugin-sentry)! Sentry reporting is used starting with js-controller 3.0.

## Using common.localLink
- `%ip%` - ioBroker ip address (address of the admin)
- `%secure%` or `%protocol%` - read from `native.secure` the value and use http or https
- `%web_protocol%` - looking for the first instance of web (e.g., `web.0`) and get `native.secure` from `system.adapter.web.0`
- `%instance%` - instance of the adapter
- `%someField%` - get someField from `native` of this adapter instance
- `%web.0_bind%` - get `native.bind` from `system.adapter.web.0`
- `%native_someField%` - get someField from `native` of this adapter instance

## Scheduled restart
Some adapters are not stable or connection disappears after one or two days.
To fix this, there is a scheduled restart setting.
To activate scheduled restart, just define CRON condition when to restart adapter.

It is suggested to restart in the night, when no one use the adapter, e.g. `0 3 * * *` - at 3:00 every day.

## Let's Encrypt Certificates
To manage and update let's encrypt certificates you need to use [`iobroker.acme`](https://github.com/iobroker-community-adapters/ioBroker.acme) adapter.

You will have so-called "collections" of certificates. Each collection has its own domains.
You can select in configuration of admin adapter if and which collection to use.

## Simple instance's settings page
The user has the possibility to limit the access to the instance configuration dialog.
For that, the option "Allow access only to specific instances" must be activated.
It could be found on the "Access to the instances" tab.
Additionally, the allowed instances should be selected in the appeared configuration table.

If this option is disabled, the simple configuration page could be accessed under `http://IP:8081/configs.html`

## Reverse proxy
Please be sure that you forward not only the http/https requests, but the web-socket traffic too. It is essential for communication.

From version 6.1.0 you have the possibility to tune intro page for usage with reverse proxy.

### Example 
Your `ioBroker.admin` runs on port 8081 behind reverse proxy with domain `iobroker.mydomain.com` under path `/ioBrokerAdmin/`. 
And you set up e.g., nginx to forward the requests to the `http://local-iobroker.IP:8081`. 

The same is with your web instance: `https://iobroker.mydomain.com/ioBrokerWeb/ => http://local-iobroker.IP:8082`.
And with rest-api instance: `https://iobroker.mydomain.com/ioBrokerAPI/ => http://local-iobroker.IP:8093`.

You can add the following lines into Reverse Proxy tab to let Intro tab run behind reverse proxy properly:

| Global path       | Instance      | Instance path behind proxy |
|-------------------|---------------|----------------------------|
| `/ioBrokerAdmin/` | `web.0`       | `/ioBrokerWeb/`            |
|                   | `rest-api.0`  | `/ioBrokerAPI/`            |
|                   | `admin.0`     | `/ioBrokerAdmin/`          |
|                   | `eventlist.0` | `/ioBrokerWeb/eventlist/`  |

So all links of instances that use web server, like `eventlist`, `vis`, `material` and so on will use `https://iobroker.mydomain.com/ioBrokerWeb/` path

## OAuth2.0 Authentication flow
There is a possibility to use OAuth2.0 authentication for other services. Admin has an endpoint `oauth2_callbacks`. 

The calls like `http(s)://ip:port/oauth2_callbacks/adapterName.X/?state=ABC&code=123&param=true&param2` will be processed and the special message `oauth2Callback` will be sent to `adapterName.X` instance with query parameters `{"state": "ABC", "code": 123, "param": true, "param2": true}`.

As mandatory response the admin expects the object like: `{"result": "Show this text to user by success", "error": "ERROR: Result will be ignored"}`. The result or error will be shown to the user. Please send already translated messages.

## Used icons
This project uses icons from [Flaticon](https://www.flaticon.com/).

ioBroker GmbH has a valid license for all used icons.
The icons may not be reused in other projects without the proper flaticon license or flaticon subscription.

## Todo
- Add to wizard (very first page): how your statistics will be processed.

<!--
	### **WORK IN PROGRESS**
-->
## Changelog
### **WORK IN PROGRESS**
* (foxriver76) fixed `installedFrom` other source indicator not shown on adapters tab
* (foxriver76) allow to use enter key to save changes in object edit dialog
* (foxriver76) fix json config crash with empty table

### 6.10.2 (2023-09-20)
* (foxriver76) harmonized data on csv export with actual data shown by admin
* (foxriver76) on expert mode installation tab, on no selection deactivate install button
* (foxriver76) on npm install, ensure the latest version is installed
* (foxriver76) optimized enum objects
* (foxriver76) disallow Google Translate as the plugin causes crash cases
* (foxriver76) fixed crash on intro tab on docker hosts
* (foxriver76) fixed crash case on invalid state objects

### 6.10.1 (2023-09-11)
* (foxriver76) fixed `between` function for showing news
* (foxriver76) if date string is not parseable show the original string instead of `Invalid Date`
* (foxriver76) updated socket classes to not crash on invalid patterns

### 6.10.0 (2023-09-08)
* (foxriver76) various minor improvements
* (foxriver76) fixed problem with discovery dialog
* (foxriver76) object browser now validates setting state of type number
* (foxriver76) allow to specify unique columns for tables
* (foxriver76) fix crash on invalid states, which are missing the property `common.role`

### 6.9.2 (2023-09-01)
* (foxriver76) show info if server time differs from client time
* (foxriver76) remove confusion with different names for state (datapoint and state)
* (jogibear9988) fixed link on 404-page being opened inside child view
* (foxriver76) fixed issue if non-text default values are provided to a text jsonConfig component
* (foxriver76) implemented del key shortcut to delete a selected object

### 6.9.1 (2023-08-22)
* (foxriver76) allow resizing of all columns in objects tab
* (foxriver76) without expert mode users are only allowed to edit objects in `0_userdata.0` and `alias.0` namespace
* (foxriver76) fixed keyboard navigation
* (foxriver76) fixed problem with showing controller upgrade instructions if no UI upgrade is supported

## License
The MIT License (MIT)

Copyright (c) 2014-2023 bluefox <dogafox@gmail.com>
