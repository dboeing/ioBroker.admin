import React, { useEffect, useState } from 'react';
import { Checkbox, LinearProgress, Switch } from '@mui/material';

import I18n from '@iobroker/adapter-react-v5/i18n';

import SelectWithIcon from '@iobroker/adapter-react-v5/Components/SelectWithIcon';
import Utils from '../Utils';
import CustomModal from '../components/CustomModal';

const readWriteArray = [
    {
        Owner: [
            { name: 'read', valueNum: 0x400, title: 'read owner' },
            { name: 'write', valueNum: 0x200, title: 'write owner' },
        ],
    },
    {
        Group: [
            { name: 'read', valueNum: 0x40, title: 'read group' },
            { name: 'write', valueNum: 0x20, title: 'write group' },
        ],
    },
    {
        Everyone: [
            { name: 'read', valueNum: 0x4, title: 'read everyone' },
            { name: 'write', valueNum: 0x2, title: 'write everyone' },
        ],
    },
];

const newValueAccessControl = (value, newValue, mask) => {
    // eslint-disable-next-line no-bitwise
    value |= newValue & mask;
    // eslint-disable-next-line no-bitwise
    value &= newValue | (~mask & 0xFFFF);
    return value;
};

const ObjectRights = ({
    value, setValue, t, differentValues, applyToChildren, mask, setMask, disabled,
}) => {
    useEffect(() => {
        if (applyToChildren) {
            let _checkDifferent = 0;
            for (let e = 0; e < differentValues.length; e++) {
                // eslint-disable-next-line no-bitwise
                _checkDifferent |= value ^ differentValues[e];
            }
            setMask(_checkDifferent);
        } else {
            setMask(0);
        }
    }, [differentValues, applyToChildren]);

    let newSelected = value;

    return <div style={{
        display: 'flex',
        width: 'fit-content',
        margin: 20,
        border: '1px solid',
        borderLeft: 0,
    }}
    >
        {readWriteArray.map(el => {
            const name = Object.keys(el)[0];

            return <div
                style={{
                    width: 150,
                    height: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderLeft: '1px solid',
                }}
                key={name}
            >
                <div style={{
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 18,
                    borderBottom: '1px solid silver',
                    width: '100%',
                    justifyContent: 'center',
                }}
                >
                    {t(name)}
                </div>
                <div style={{
                    display: 'flex',
                    width: '100%',
                }}
                >
                    {el[name].map((obj, idx) => {
                        let bool = false;
                        // eslint-disable-next-line no-bitwise
                        const masked = mask & obj.valueNum;

                        if (newSelected - obj.valueNum >= 0) {
                            newSelected -= obj.valueNum;
                            bool = true;
                        }

                        return <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                alignItems: 'center',
                                borderRight: idx === 0 ? '1px solid' : 0,
                            }}
                            key={obj.valueNum}
                        >
                            <div style={{
                                height: 50,
                                borderBottom: '1px solid',
                                width: '100%',
                                justifyContent: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'silver',
                            }}
                            >
                                {t(obj.name)}
                            </div>
                            <div style={{ height: 50, display: 'flex' }}>
                                <Checkbox
                                    disabled={disabled}
                                    checked={bool}
                                    color={masked ? 'primary' : 'secondary'}
                                    indeterminate={!!(masked)}
                                    style={masked ? { opacity: 0.5 } : null}
                                    onChange={e => {
                                        if (masked) {
                                            // eslint-disable-next-line no-bitwise
                                            mask &= (~obj.valueNum) & 0xFFFF;
                                            setMask(mask);
                                        }
                                        let newValue = value;
                                        if (!e.target.checked) {
                                            // eslint-disable-next-line no-bitwise
                                            newValue &= (~obj.valueNum) & 0xFFFF;
                                        } else {
                                            // eslint-disable-next-line no-bitwise
                                            newValue |= obj.valueNum;
                                        }
                                        setValue(newValue);
                                    }}
                                />
                            </div>
                        </div>;
                    })}
                </div>
            </div>;
        })}
    </div>;
};

async function loadFolders(folderId, folders, socket) {
    let files = folders[folderId];
    if (!files) {
        const parts = folderId.split('/');
        const level = parts.length;
        const adapter = parts.shift();
        const relPath = parts.join('/');
        files = await socket.readDir(adapter, relPath);
        folders[folderId] = [];
        for (let f = 0; f < files.length; f++) {
            const file = files[f];
            const item = {
                id: `${folderId}/${file.file}`,
                ext: Utils.getFileExtension(file.file),
                folder: file.isDir,
                name: file.file,
                size: file.stats && file.stats.size,
                modified: file.modifiedAt,
                acl: file.acl,
                level,
            };
            folders[folderId].push(item);
        }
    }

    for (let f = 0; f < files.length; f++) {
        const item = files[f];
        if (item.folder) {
            await loadFolders(item.id, folders, socket);
        }
    }
}

function flatList(folders) {
    const list = {};

    Object.keys(folders)
        .forEach(key => {
            list[key] = {
                folder: true,
            };
            folders[key].forEach(item => {
                list[item.id] = item;
            });
        });

    return list;
}

async function loadPath(socket, folders, path, adapter, part, level) {
    if (typeof path === 'string') {
        path = path.split('/');
        level = 0;
        adapter = path.shift();
        part = '';
    }

    if (path.length >= level) {
        return;
    }

    if (folders[adapter + part]) {
        if (path.length - 1 === level) {
            // try to find file
            const aa = `${adapter + part}/${path[level]}`;
            const ff = folders[adapter + part].find(item => item.id === aa);
            if (ff && ff.folder) {
                // load all
                await loadFolders(adapter + part, folders, socket);
            }
            return;
        }
        part += `/${path[level]}`;

        await loadPath(socket, folders, path, adapter, part, level + 1);
    } else {
        // load path
        const files = await socket.readDir(adapter, part);
        folders[adapter + part] = [];
        files.forEach(file => {
            const item = {
                id:       `${part}/${file.file}`,
                ext:      Utils.getFileExtension(file.file),
                folder:   file.isDir,
                name:     file.file,
                size:     file.stats && file.stats.size,
                modified: file.modifiedAt,
                acl:      file.acl,
                level,
            };

            folders[adapter + part].push(item);
        });

        await loadPath(socket, folders, path, adapter, part, level + 1);
    }
}

const DIFFERENT = 'different';

const FileEditOfAccessControl2 = ({
    onClose, onApply, open, selected, extendObject, objects, t, themeType, folders, socket,
}) => {
    const select = selected.substring(0, selected.lastIndexOf('/')) || selected;
    const object = selected.split('/').length === 1 ? folders['/'].find(({ id }) => id === selected) : folders[select].find(({ id }) => id === selected);
    const [stateOwnerUser, setStateOwnerUser] = useState(null);
    const [stateOwnerGroup, setStateOwnerGroup] = useState(null);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [applyToChildren, setApplyToChildren] = useState(false);
    const [childrenCount, setChildrenCount] = useState(0);
    const [valueFileAccessControl, setValueFileAccessControl] = useState(null);
    const [differentOwner, setDifferentOwner] = useState(false);
    const [differentGroup, setDifferentGroup] = useState(false);
    const [differentObject, setDifferentObject] = useState([]);
    const [maskObject, setMaskObject] = useState(0);
    const [ids, setIds] = useState([]);
    const [disabledButton, setDisabledButton] = useState(true);
    const [progress, setProgress] = useState(false);

    const lang = I18n.getLanguage();

    useEffect(() => {
        const _differentObject = [];

        const id = object.id;

        let _differentOwner = false;
        let _differentGroup = false;
        let _stateOwnerUser = null;
        let _stateOwnerGroup = null;
        let _valueFileAccessControl = null;
        const _ids = [];
        let count = 0;

        loadPath(socket, folders, id)
            .then(() => {
                const list = flatList(folders);

                const idWithSlash = `${id}/`;

                Object.keys(list).forEach(key => {
                    if (key === '/') {
                        return;
                    }

                    if (key === id || key.startsWith(idWithSlash)) {
                        if (!key.includes('/') && objects[key]) { // it is object
                            const objFolder = objects[key];
                            count++;
                            _ids.push(objFolder);

                            if (_valueFileAccessControl === null && objFolder.acl.file !== undefined) {
                                _valueFileAccessControl = objFolder.acl.file;
                            }
                            if (_stateOwnerUser === null && objFolder.acl.owner !== undefined) {
                                _stateOwnerUser = objFolder.acl.owner;
                            }
                            if (_stateOwnerGroup === null && objFolder.acl.ownerGroup !== undefined) {
                                _stateOwnerGroup = objFolder.acl.ownerGroup;
                            }

                            if (!differentOwner && _stateOwnerUser !== objFolder.acl.owner && objFolder.acl.owner !== undefined) {
                                _differentOwner = true;
                            }
                            if (!differentGroup && _stateOwnerGroup !== objFolder.acl.ownerGroup && objFolder.acl.ownerGroup !== undefined) {
                                _differentGroup = true;
                            }
                            if (objFolder.acl.file !== undefined && _valueFileAccessControl !== objFolder.acl.file && !_differentObject.includes(objFolder.acl.file)) {
                                _differentObject.push(objFolder.acl.file);
                            }
                        } else if (!list[key].folder) {
                            count++;
                            const keyFolder = list[key];
                            _ids.push(keyFolder);
                            if (_valueFileAccessControl === null && keyFolder.acl.permissions !== undefined) {
                                _valueFileAccessControl = keyFolder.acl.permissions;
                            }
                            if (_stateOwnerUser === null && keyFolder.acl.owner !== undefined) {
                                _stateOwnerUser = keyFolder.acl.owner;
                            }
                            if (_stateOwnerGroup === null && keyFolder.acl.ownerGroup !== undefined) {
                                _stateOwnerGroup = keyFolder.acl.ownerGroup;
                            }

                            if (!differentOwner && _stateOwnerUser !== keyFolder.acl.owner && keyFolder.acl.owner !== undefined) {
                                _differentOwner = true;
                            }
                            if (!differentGroup && _stateOwnerGroup !== keyFolder.acl.ownerGroup && keyFolder.acl.ownerGroup !== undefined) {
                                _differentGroup = true;
                            }
                            if (keyFolder.acl.permissions !== undefined && _valueFileAccessControl !== keyFolder.acl.permissions && !_differentObject.includes(keyFolder.acl.permissions)) {
                                _differentObject.push(keyFolder.acl.permissions);
                            }
                        }
                    }
                });

                const _users = [];
                const _groups = [];
                // Get users and groups
                Object.keys(objects).forEach(_id => {
                    const obj = objects[_id];
                    if (_id.startsWith('system.group.') && obj?.type === 'group') {
                        _groups.push(obj);
                    } else
                        if (_id.startsWith('system.user.') && obj?.type === 'user') {
                            _users.push(obj);
                        }
                });

                const defaultAcl = objects['system.config'].common.defaultNewAcl;

                _stateOwnerUser = _stateOwnerUser || defaultAcl.owner;
                _stateOwnerGroup = _stateOwnerGroup || defaultAcl.ownerGroup;
                _valueFileAccessControl = _valueFileAccessControl || defaultAcl.file;
                setValueFileAccessControl(_valueFileAccessControl);

                setStateOwnerUser(_stateOwnerUser);
                setStateOwnerGroup(_stateOwnerGroup);

                setDifferentOwner(_differentOwner);
                setDifferentGroup(_differentGroup);

                setUsers(_users);
                setGroups(_groups);

                object.folder && setApplyToChildren(true);
                setChildrenCount(count);

                setDifferentObject(_differentObject);

                setIds(_ids);
            });
    }, [objects, selected]);

    useEffect(() => {
        if (applyToChildren) {
            if (differentOwner) {
                stateOwnerUser !== DIFFERENT && setStateOwnerUser(DIFFERENT);
            }

            if (differentGroup) {
                stateOwnerGroup !== DIFFERENT && setStateOwnerGroup(DIFFERENT);
            }
        } else {
            if (stateOwnerUser && stateOwnerUser === DIFFERENT) {
                setStateOwnerUser(objects[selected].acl.owner);
            }
            if (stateOwnerGroup && stateOwnerGroup === DIFFERENT) {
                setStateOwnerGroup(objects[selected].acl.ownerGroup);
            }
        }
        console.log(`stateOwnerUser ${stateOwnerUser}`);
    }, [applyToChildren, stateOwnerUser, stateOwnerGroup, differentOwner, differentGroup]);

    if (!ids.length) {
        return <LinearProgress />;
    }
    return <CustomModal
        open={open}
        titleButtonApply="apply"
        overflowHidden
        applyDisabled={disabledButton}
        progress={progress}
        onClose={onClose}
        onApply={() => {
            setProgress(true);
            setTimeout(async () => {
                const defaultAclFile = objects['system.config'].common?.defaultNewAcl?.file || 0x664;

                if (!applyToChildren) {
                    const parts = object.id.split('/');
                    const adapter = parts.shift();
                    const path = parts.join('/');
                    const newAcl = {};
                    let changed = false;
                    if (!object.folder) {
                        if (object.acl?.permissions !== valueFileAccessControl) {
                            newAcl.permissions = valueFileAccessControl;
                            changed = true;
                        }
                        if (object.acl?.owner !== stateOwnerUser) {
                            newAcl.owner = stateOwnerUser;
                            changed = true;
                        }
                        if (object.acl?.ownerGroup !== stateOwnerGroup) {
                            newAcl.ownerGroup = stateOwnerGroup;
                            changed = true;
                        }
                        changed && (await extendObject(adapter, path, newAcl));
                    } else if (!parts.length && objects[object.id]) {
                        // setObject(acl)
                        const obj = objects[object.id];
                        if (obj.acl?.file !== valueFileAccessControl) {
                            obj.acl = obj.acl || {};
                            obj.acl.file = valueFileAccessControl;
                            changed = true;
                        }
                        if (obj.acl?.owner !== stateOwnerUser) {
                            obj.acl = obj.acl || {};
                            obj.acl.owner = stateOwnerUser;
                            changed = true;
                        }
                        if (obj.acl?.ownerGroup !== stateOwnerGroup) {
                            obj.acl = obj.acl || {};
                            obj.acl.ownerGroup = stateOwnerGroup;
                            changed = true;
                        }
                        changed && (await extendObject(obj._id, obj));
                    }
                } else {
                    // eslint-disable-next-line no-bitwise
                    const _maskObject = ~maskObject & 0xFFFF;
                    for (let i = 0; i < ids.length; i++) {
                        const item = ids[i];
                        let changed = false;

                        if (item._id) {
                            // it is object
                            const permissions = newValueAccessControl(item.acl?.file || defaultAclFile, valueFileAccessControl, _maskObject);
                            if (permissions !== item.acl?.file) {
                                item.acl = item.acl || {};
                                item.acl.file = permissions;
                                changed = true;
                            }
                            if (stateOwnerUser !== DIFFERENT && stateOwnerUser !== item.acl?.owner) {
                                item.acl = item.acl || {};
                                item.acl.owner = stateOwnerUser;
                                changed = true;
                            }
                            if (stateOwnerGroup !== DIFFERENT && stateOwnerGroup !== item.acl?.ownerGroup) {
                                item.acl = item.acl || {};
                                item.acl.ownerGroup = stateOwnerGroup;
                                changed = true;
                            }
                            changed && (await extendObject(item._id, item));
                        } else if (item && !item.folder) {
                            const newAcl = {};
                            const permissions = newValueAccessControl(item.acl?.permissions || defaultAclFile, valueFileAccessControl, _maskObject);
                            if (permissions !== item.acl?.permissions) {
                                newAcl.permissions = permissions;
                                changed = true;
                            }
                            if (stateOwnerUser !== DIFFERENT && stateOwnerUser !== item.acl?.owner) {
                                newAcl.owner = stateOwnerUser;
                                changed = true;
                            }
                            if (stateOwnerGroup.value !== DIFFERENT && stateOwnerGroup !== item.acl?.ownerGroup) {
                                newAcl.ownerGroup = stateOwnerGroup;
                                changed = true;
                            }
                            if (changed) {
                                const parts = item.id.split('/');
                                const adapter = parts.shift();
                                const path = parts.join('/');
                                changed && (await extendObject(adapter, path, newAcl));
                            }
                        }
                    }
                }

                setProgress(false);
                onApply();
            }, 200);
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
                margin: 10,
                fontSize: 20,
            }}
            >
                {t('Access control list: %s', selected)}
            </div>

            <div style={{ display: 'flex' }}>
                <SelectWithIcon
                    fullWidth
                    style={{ marginRight: 10 }}
                    label={t('Owner user')}
                    lang={lang}
                    list={users}
                    t={t}
                    disabled={progress}
                    value={stateOwnerUser}
                    themeType={themeType}
                    different={differentOwner ? DIFFERENT : false}
                    onChange={val => {
                        setDifferentOwner(false);
                        setStateOwnerUser(val);
                        setDisabledButton(false);
                    }}
                />
                <SelectWithIcon
                    fullWidth
                    label={t('Owner group')}
                    lang={lang}
                    list={groups}
                    t={t}
                    disabled={progress}
                    value={stateOwnerGroup}
                    themeType={themeType}
                    different={differentGroup ? DIFFERENT : false}
                    onChange={val => {
                        setDifferentGroup(false);
                        setStateOwnerGroup(val);
                        setDisabledButton(false);
                    }}
                />
            </div>

            <div style={{
                display: 'flex',
                margin: 10,
                alignItems: 'center',
                fontSize: 10,
                marginLeft: 0,
                color: 'silver',
            }}
            >
                <div style={(!object.folder || !applyToChildren) ? { color: 'green' } : null}>{t('to apply one item')}</div>
                <Switch
                    disabled={ids.length === 1 || progress}
                    checked={(!objects[object.id] && !!object.folder) || applyToChildren}
                    onChange={e => {
                        setApplyToChildren(e.target.checked);
                        setDisabledButton(false);
                    }}
                    color="primary"
                />
                <div style={(object.folder || applyToChildren) ? { color: 'green' } : null}>
                    {t('to apply with children')}
                    {' '}
                    {(object.folder || childrenCount > 1) ? `(${childrenCount} ${t('object(s)')})` : ''}
                </div>
            </div>

            {progress && <LinearProgress />}

            <div style={{ overflowY: 'auto' }}>
                <div>
                    <h2>{t('File rights')}</h2>
                    <ObjectRights
                        disabled={progress}
                        mask={maskObject}
                        setMask={setMaskObject}
                        applyToChildren={applyToChildren}
                        differentValues={differentObject}
                        t={t}
                        setValue={e => {
                            setValueFileAccessControl(e);
                            setDisabledButton(false);
                        }}
                        value={valueFileAccessControl}
                    />
                </div>
            </div>
        </div>
    </CustomModal>;
};

export default FileEditOfAccessControl2;
