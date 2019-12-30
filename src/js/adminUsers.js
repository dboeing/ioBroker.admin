function Users(main) {
    'use strict';

    var that          = this;
    this.groups       = [];
    this.list         = [];
    this.$grid        = $('#tab-users');
    this.$gridUsers   = this.$grid.find('.tab-users-list-users .tab-users-body');
    this.$gridGroups  = this.$grid.find('.tab-users-list-groups .tab-users-body');
    this.main         = main;
    this.aclGroups    = null;

    function synchronizeUser(userId, userGroups, callback) {
        var obj;
        userGroups = userGroups || [];
        for (var i = 0; i < that.groups.length; i++) {
            // If user has no group, but group has user => delete user from group
            var members = that.main.objects[that.groups[i]] && that.main.objects[that.groups[i]].common && that.main.objects[that.groups[i]].common.members;
            var pos;
            if (userGroups.indexOf(that.groups[i]) === -1 && members && (pos = members.indexOf(userId)) !== -1) {
                members.splice(pos, 1);
                obj = {common: {members: members}};
                that.main.socket.emit('extendObject', that.groups[i], obj, function (err) {
                    if (err) {
                        showMessageInDialog(err, true, 5000);
                        if (callback) callback(err);
                    } else {
                        setTimeout(function () {
                            synchronizeUser(userId, userGroups, callback);
                        }, 0);
                    }
                });
                return;
            }
            if (userGroups.indexOf(that.groups[i]) !== -1 &&
                (!members || members.indexOf(userId) === -1)) {
                members = members || [];
                members.push(userId);
                that.main.objects[that.groups[i]].common.members = members;
                obj = {common: {members: members}};
                that.main.socket.emit('extendObject', that.groups[i], obj, function (err) {
                    if (err) {
                        showMessageInDialog(err, true, 5000);
                        if (callback) callback(err);
                    } else {
                        setTimeout(function () {
                            synchronizeUser(userId, userGroups, callback);
                        }, 0);
                    }
                });
                return;
            }
        }
        if (callback) callback();
    }

    function getUserGroups(userId) {
        var userGroups = [];
        for (var i = 0; i < that.groups.length; i++) {
            if (userGroups.indexOf(that.groups[i]) === -1 &&
                that.main.objects[that.groups[i]].common.members &&
                that.main.objects[that.groups[i]].common.members.indexOf(userId) !== -1) {
                userGroups.push(that.groups[i]);
            }
        }
        return userGroups;
    }

    this.prepare = function () {

    };

    function showMessage(text, duration, isError) {
        if (typeof duration === 'boolean') {
            isError = duration;
            duration = 3000;
        }
        that.main.showToast(that.$grid, text, null, duration, isError);
    }

    function showMessageInDialog(text, duration, isError) {
        if (typeof duration === 'boolean') {
            isError = duration;
            duration = 3000;
        }
        that.main.showToast(that.$grid.find('#tab-users-dialog-new'), text, null, duration, isError);
    }

    function firstUpper (str) {
        if (!str) return str;
        return str[0].toUpperCase() + str.substring(1).toLowerCase();
    }

    function getUsersGroups(objects, groups) {
        var usersGroups = {};
        for (var g = 0; g < groups.length; g++) {
            if (objects[groups[g]] && objects[groups[g]].common && objects[groups[g]].common.members) {
                var users = objects[groups[g]].common.members;
                for (var u = 0; u < users.length; u++) {
                    usersGroups[users[u]] = usersGroups[users[u]] || [];
                    usersGroups[users[u]].push({id: groups[g], name: objects[groups[g]].common.name || groups[g].replace('system.group.', '')});
                }
            }
        }
        return usersGroups;
    }

    function delUserFromGroups(id, callback) {
        var count = 0;
        for (var i = 0; i < that.groups.length; i++) {
            var group = that.main.objects[that.groups[i]];
            // If user has no group, but group has user => delete user from group
            if (group && group.common && group.common.members && group.common.members.indexOf(id) !== -1) {
                group.common.members.splice(group.common.members.indexOf(id), 1);
                that.main.socket.emit('extendObject', that.groups[i], {
                    common: {
                        members: group.common.members
                    }
                }, function (err) {
                    if (err) {
                        showMessage(_('Cannot modify groups: %s', err), true);
                    } else {
                        setTimeout(function () {
                            delUserFromGroups(id, callback);
                        }, 0);
                    }
                });
                return;
            }
        }
        callback && callback();
    }

    function deleteUser(id) {
        if (that.main.objects[id] && that.main.objects[id].type === 'user') {
            if (that.main.objects[id].common && that.main.objects[id].common.dontDelete) {
                showMessage(_('Object may not be deleted'), true);
            } else {
                delUserFromGroups(id, function () {
                    that.main.socket.emit('delObject', id, function (err) {
                        if (err) {
                            showMessage(_('User may not be deleted: %s', err), true);
                        } else {
                            showMessage(_('User deleted'));
                        }
                    });
                });
            }
        } else {
            showMessage(_('Invalid object: %s', id), true);
        }
    }

    function deleteGroup(id) {
        if (that.main.objects[id] && that.main.objects[id].type === 'group') {
            if (that.main.objects[id].common && that.main.objects[id].common.dontDelete) {
                showMessage(_('Object may not be deleted'), true);
            } else {
                that.main.socket.emit('delObject', id, function (err) {
                    if (err) {
                        showMessage(_('Group may not be deleted: %s', err), true);
                    } else {
                        showMessage(_('Group deleted'));
                    }
                });
            }
        } else {
            showMessage(_('Invalid object: %s', id), true);
        }
    }

    function updateGroup(event, oldId, options) {
        if ((oldId === 'system.group.administrator' && options.id !== 'administrator')) {
            event.stopPropagation();
            showMessageInDialog(_('Cannot change name of "%s"', 'administrator'), true);
            return;
        }
        if ((oldId === 'system.group.user' && options.id !== 'user')) {
            event.stopPropagation();
            showMessageInDialog(_('Cannot change name of "%s"', 'user'), true);
            return;
        }
        if (!options.id) {
            event.stopPropagation();
            showMessageInDialog(_('ID may not be empty'), true);
            return;
        }
        if (oldId) {

            //var obj = {common: options/*{desc: desc, acl: acl}*/};

            // If ID changed
            if ('system.group.' + options.id !== oldId) {
                if (that.main.objects['system.group.' + options.id]) {
                    event.stopPropagation();
                    showMessageInDialog(_('ID yet exists'), true);
                    return;
                }
                that.main.socket.emit('getObject', oldId, function (err, oldObj) {
                    if (err) {
                        showMessage(_('Cannot change group: ') + err, true);
                    } else {
                        var id = options.id;
                        oldObj.common.name  = options.name;
                        oldObj.common.color = options.color;
                        oldObj.common.icon  = options.icon;
                        oldObj.common.desc  = options.desc;
                        delete options.id;
                        that.main.socket.emit('delObject', oldId, function (err) {
                            if (err) {
                                showMessage(_('Cannot rename group: ') + err, true);
                                event.stopPropagation();
                            } else {
                                that.main.socket.emit('setObject', id, oldObj, function (err) {
                                    if (err) {
                                        showMessage(_('Cannot change group: ') + err, true);
                                    } else {
                                        showMessage(_('Updated'));
                                    }
                                });
                            }
                        });
                    }
                });
            } else {
                delete options.id;
                that.main.socket.emit('extendObject', oldId, {common: options}, function (err, res) {
                    if (err) {
                        showMessage(_('Cannot change group: ') + err, true);
                    } else {
                        showMessage(_('Updated'));
                    }
                });
            }
        } else {
            if (!options.id) {
                event.stopPropagation();
                showMessageInDialog(_('ID may not be empty'), true);
                return;
            }
            that.main.socket.emit('addGroup', options.id, options.desc, null /* acl */, function (err, obj) {
                if (err) {
                    showMessage(_('Cannot create group: ') + err, true);
                } else {
                    that.main.socket.emit('extendObject', obj._id, {common: options}, function (err) {
                        if (err) {
                            showMessage(_('Cannot add group: ') + err, true);
                        } else {
                            showMessage(_('Created'));
                        }
                    });
                }
            });
        }
    }

    function updateUser(event, oldId, options) {
        var password    = that.$grid.find('#tab-users-dialog-new-password').val();
        var passwordRep = that.$grid.find('#tab-users-dialog-new-password-repeat').val();

        if (password !== '__pass_not_set__' && password !== passwordRep) {
            event.stopPropagation();
            showMessageInDialog(_('Password and confirmation are not equal!'), true);
            return;
        }
        if (!password) {
            event.stopPropagation();
            showMessageInDialog(_('Password cannot be empty!'), true);
            return;
        }
        if ((oldId === 'system.user.admin' && options.id !== 'admin')) {
            event.stopPropagation();
            showMessageInDialog(_('Cannot change name of "%s"', 'admin'), true);
            return;
        }
        if (!options.id) {
            event.stopPropagation();
            showMessageInDialog(_('ID may not be empty'), true);
            return;
        }
        if (oldId) {
            // If ID changed
            if ('system.user.' + options.id !== oldId) {
                if (that.main.objects['system.user.' + options.id]) {
                    event.stopPropagation();
                    showMessageInDialog(_('User yet exists'), true);
                    return;
                }
                that.main.socket.emit('getObject', oldId, function (err, oldObj) {
                    if (err) {
                        showMessage(_('Cannot change user: ') + err, true);
                    } else {
                        var shortId = options.id;
                        var id = 'system.user.' + shortId;
                        oldObj.common.name  = options.name;
                        oldObj.common.color = options.color;
                        oldObj.common.icon  = options.icon;
                        oldObj.common.desc  = options.desc;
                        delete options.id;
                        var userGroups = getUserGroups(oldId);
                        that.main.socket.emit('delObject', oldId, function (err) {
                            if (err) {
                                showMessage(_('Cannot rename user: ') + err, true);
                            } else {
                                // delete user from all groups
                                synchronizeUser(oldId, [], function () {
                                    that.main.socket.emit('setObject', id, oldObj, function (err) {
                                        if (err) {
                                            showMessage(_('Cannot change group: ') + err, true);
                                        } else {
                                            // place new user in old groups
                                            synchronizeUser(id, userGroups, function () {
                                                if (password !== '__pass_not_set__') {
                                                    that.main.socket.emit('changePassword', shortId, password, function (err) {
                                                        if (err) {
                                                            showMessage(_('Cannot set password: ') + _(err), true);
                                                        } else {
                                                            showMessage(_('Updated'));
                                                        }
                                                    });
                                                } else {
                                                    showMessage(_('Updated'));
                                                }
                                            });
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            } else {
                delete options.id;
                if (password !== '__pass_not_set__') {
                    that.main.socket.emit('changePassword', oldId.replace('system.user.', ''), password, function (err) {
                        if (err) {
                            showMessage(_('Cannot set password: ') + _(err), true);
                        } else {
                            that.main.socket.emit('extendObject', oldId, {common: options}, function (err, res) {
                                if (err) {
                                    showMessage(_('Cannot change group: ') + err, true);
                                } else {
                                    showMessage(_('Updated'));
                                }
                            });
                        }
                    });
                } else {
                    that.main.socket.emit('extendObject', oldId, {common: options}, function (err, res) {
                        if (err) {
                            showMessage(_('Cannot change group: ') + err, true);
                        } else {
                            showMessage(_('Updated'));
                        }
                    });
                }
            }
        } else {
            if (that.main.objects['system.user.' + options.id]) {
                event.stopPropagation();
                showMessageInDialog(_('User yet exists'), true);
                return;
            }
            var idShort = options.id;
            var obj = {
                _id:    'system.user.' + idShort,
                common: options,
                type:   'user',
                native: {}
            };
            options.enabled = true;
            delete options.id;

            that.main.socket.emit('setObject', obj._id, obj, function (err) {
                if (err) {
                    showMessage(_('Cannot add user: ') + err, true);
                } else {
                    if (password !== '__pass_not_set__') {
                        that.main.socket.emit('changePassword', idShort, password, function (err) {
                            if (err) {
                                showMessage(_('Cannot set password: ') + _(err), true);
                            } else {
                                showMessage(_('Created'));
                            }
                        });
                    } else {
                        showMessage(_('Created'));
                    }
                }
            });
        }
    }

    function fillAcl(id, acl) {
        // Fill the checkboxes
        if (id === 'system.group.administrator') {
            for (var a in acl) {
                if (!acl.hasOwnProperty(a)) continue;
                if (typeof acl[a] === 'object') {
                    for (var b in acl[a]) {
                        if (!acl[a].hasOwnProperty(b)) continue;
                        acl[a][b] = true;
                    }
                } else {
                    acl[a] = true;
                }
            }

            for (var gg in that.aclGroups) {
                if (that.aclGroups.hasOwnProperty(gg)) {
                    acl[gg] = {};
                    for (var i = 0; i < that.aclGroups[gg].length; i++) {
                        acl[gg][that.aclGroups[gg][i]] = true;
                    }
                }
            }
        }
        that.$grid.find('.edit-group-permissions').prop('disabled', (id === 'system.group.administrator')).each(function () {
            var type      = $(this).data('type');
            var operation = $(this).data('operation');
            $(this).prop('checked', acl[type] ? acl[type][operation] : false);
        });
    }

    function readAcl(acl) {
        that.$grid.find('.edit-group-permissions').each(function () {
            var type      = $(this).data('type');
            var operation = $(this).data('operation');
            acl = acl || {};
            acl[type] = acl[type] || {};
            acl[type][operation] = $(this).prop('checked');
        });
    }

    function checkValidId($dialog) {
        var $id = that.$grid.find('#tab-users-dialog-new-id');
        var id = $id.val();
        if (id && !id.match(/[.\s]/)) {
            $dialog.find('.tab-dialog-create').removeClass('disabled');
            $id.removeClass('wrong');
        } else {
            $dialog.find('.tab-dialog-create').addClass('disabled');
            $id.addClass('wrong');
        }
    }

    function createOrEdit(isGroupOrId) {
        var idChanged = false;
        var $dialog = that.$grid.find('#tab-users-dialog-new');
        var options = {
            name:  '',
            icon:  '',
            color: '',
            desc:  '',
            id:    '',
            acl:   {}
        };
        var parent  = isGroupOrId === true ? 'system.group' : 'system.user';
        var oldId   = '';
        var isGroup = isGroupOrId === true;
        var prevId;

        installFileUpload($dialog, 50000, function (err, text) {
            if (err) {
                showMessage(err, true);
            } else {
                if (!text.match(/^data:image\//)) {
                    showMessage(_('Unsupported image format'), true);
                    return;
                }
                checkValidId($dialog);
                options.icon = text;

                $dialog.find('.tab-dialog-new-icon').show().html('<img class="treetable-icon" />');
                $dialog.find('.tab-dialog-new-icon .treetable-icon').attr('src', text);
                $dialog.find('.tab-dialog-new-icon-clear').show();
            }
        });
        if (typeof isGroupOrId === 'string') {
            if (that.main.objects[isGroupOrId] && that.main.objects[isGroupOrId].common) {
                options.name  = that.main.objects[isGroupOrId].common.name;
                options.icon  = that.main.objects[isGroupOrId].common.icon;
                options.color = that.main.objects[isGroupOrId].common.color;
                options.desc  = that.main.objects[isGroupOrId].common.desc;
                isGroup = that.main.objects[isGroupOrId].type === 'group';
                if (isGroup) {
                    options.acl = that.main.objects[isGroupOrId].common.acl || {};
                }
            }
            oldId = isGroupOrId;
            options.id = isGroupOrId;
        }
        $dialog.find('.tab-dialog-new-title').text(isGroupOrId === true ? _('Create new group') : (options.id ? _('Change') : _('Create new user')));

        if (options.id) {
            var parts = options.id.split('.');
            options.id = parts.pop();
            parent = parts.join('.');
        }
        $dialog.find('#tab-users-dialog-new-name')
            .val(translateName(options.name))
            .off('change')
            .on('change', function () {
                var $id = that.$grid.find('#tab-users-dialog-new-id');
                var id = $id.val();
                var val = $(this).val();
                val = val.trim().replace(FORBIDDEN_CHARS, '_').replace(/\./g, '_').toLowerCase();
                if ((!id || !idChanged) &&
                    ((isGroup  && id !== 'administrator' && id !== 'user') ||
                     (!isGroup && id !== 'admin')))
                {
                    $id.val(val);
                    prevId = val;
                    $dialog.find('#tab-users-dialog-new-preview').val(parent + '.' + (val || '#'));
                    M.updateTextFields('#tab-users-dialog-new');
                }
                checkValidId($dialog);
            }).off('keyup').on('keyup', function () {
            $(this).trigger('change');
        });

        $dialog.find('#tab-users-dialog-new-desc')
            .val(options.desc)
            .off('change')
            .on('change', function () {
                checkValidId($dialog);
            }).off('keyup').on('keyup', function () {
            $(this).trigger('change');
        });

        prevId = options.id;
        $dialog.find('#tab-users-dialog-new-id')
            .val(options.id)
            .off('change')
            .on('change', function () {
                var val = $(this).val();
                if (prevId !== val) {
                    idChanged = true;
                    prevId    = val;
                    $dialog.find('#tab-users-dialog-new-preview').val(parent + '.' + (val || '#'));
                    M.updateTextFields('#tab-users-dialog-new');
                    checkValidId($dialog);
                }
            }).off('keyup').on('keyup', function () {
            $(this).trigger('change');
        });

        $dialog.find('.tab-dialog-create')
            .addClass('disabled')
            .off('click')
            .text(oldId ? _('Change') : _('Create'))
            .on('click', function (event) {
                options.name = $dialog.find('#tab-users-dialog-new-name').val();
                options.id   = $dialog.find('#tab-users-dialog-new-id').val();
                options.desc = $dialog.find('#tab-users-dialog-new-desc').val();
                // if change Group
                if (isGroup) {
                    options.acl = options.acl || {};
                    readAcl(options.acl);
                    updateGroup(event, oldId, options);
                } else {
                    delete options.acl;
                    updateUser(event, oldId, options);
                }
            });

        $dialog.find('#tab-users-dialog-new-preview').val(parent + '.' + (options.id || '#'));

        if (options.icon) {
            $dialog.find('.tab-dialog-new-icon').show().html(that.main.getIcon(oldId));
            $dialog.find('.tab-dialog-new-icon-clear').show();
        } else {
            $dialog.find('.tab-dialog-new-icon').hide();
            $dialog.find('.tab-dialog-new-icon-clear').hide();
        }
        options.color = options.color || false;
        if (options.color) {
            $dialog.find('.tab-dialog-new-color').val(options.color);
        } else {
            $dialog.find('.tab-dialog-new-color').val();
        }

        showMessageInDialog(_('Drop the icons here'));
        $dialog.find('.tab-dialog-new-upload').off('click').on('click', function () {
            $dialog.find('.drop-file').trigger('click');
        });
        $dialog.find('.tab-dialog-new-icon-clear').off('click').on('click', function () {
            if (options.icon) {
                options.icon = '';
                $dialog.find('.tab-dialog-new-icon').hide();
                $dialog.find('.tab-dialog-new-icon-clear').hide();
                checkValidId($dialog);
            }
        });
        $dialog.find('.tab-dialog-new-color-clear').off('click').on('click', function () {
            if (options.color) {
                checkValidId($dialog);
                $dialog.find('.tab-dialog-new-color-clear').hide();
                $dialog.find('.tab-dialog-new-colorpicker').colorpicker({
                    component:  '.btn',
                    color:      options.color,
                    container:  $dialog.find('.tab-dialog-new-colorpicker')
                }).colorpicker('setValue', '');
                options.color = '';
            }
        });
        var time = Date.now();
        try {
            $dialog.find('.tab-dialog-new-colorpicker').colorpicker('destroy');
        } catch (e) {

        }
        $dialog.find('.tab-dialog-new-colorpicker').colorpicker({
            component: '.btn',
            color: options.color,
            container: $dialog.find('.tab-dialog-new-colorpicker')
        }).colorpicker('setValue', options.color).on('showPicker.colorpicker', function (/* event */) {
            var $modal = $dialog.find('.modal-content');
            $modal[0].scrollTop = $modal[0].scrollHeight;
        }).on('changeColor.colorpicker', function (event) {
            if (Date.now() - time > 100) {
                options.color = event.color.toHex();
                checkValidId($dialog);
                $dialog.find('.tab-users-dialog-new-icon-clear').show();
            }
        });
        $dialog.find('#tab-users-dialog-new-password').off('change').on('change', function () {
            checkValidId($dialog);
        });
        $dialog.find('#tab-users-dialog-new-password-repeat').off('change').on('change', function () {
            checkValidId($dialog);
        });
        if (options.color) {
            $dialog.find('.tab-dialog-new-color-clear').show();
        } else {
            $dialog.find('.tab-dialog-new-color-clear').hide();
        }
        if (isGroup) {
            $dialog.find('.tab-users-dialog-new-password').hide();
            if (oldId === 'system.group.administrator' || oldId === 'system.group.user') {
                $dialog.find('#tab-users-dialog-new-id').prop('disabled', true);
            } else {
                $dialog.find('#tab-users-dialog-new-id').prop('disabled', false);
            }
        } else {
            $dialog.find('.tab-users-dialog-new-password').show();
            if (oldId) {
                $dialog.find('#tab-users-dialog-new-password').val('__pass_not_set__');
                $dialog.find('#tab-users-dialog-new-password-repeat').val('__pass_not_set__');
            } else {
                $dialog.find('#tab-users-dialog-new-password').val('');
                $dialog.find('#tab-users-dialog-new-password-repeat').val('');
            }
            if (oldId === 'system.user.admin') {
                $dialog.find('#tab-users-dialog-new-id').prop('disabled', true);
            } else {
                $dialog.find('#tab-users-dialog-new-id').prop('disabled', false);
            }
        }
        if (isGroup) {
            options.acl = options.acl || {};
            if (!that.aclGroups) {
                // Fill the rights
                that.main.socket.emit('listPermissions', function (permissions) {
                    that.aclGroups = {};

                    var text = '';

                    var ops = [];
                    for (var p in permissions) {
                        if (!permissions.hasOwnProperty(p) || !permissions[p] || !permissions[p].type) continue;
                        that.aclGroups[permissions[p].type] = that.aclGroups[permissions[p].type] || [];
                        if (that.aclGroups[permissions[p].type].indexOf(permissions[p].operation) === -1) {
                            that.aclGroups[permissions[p].type].push(permissions[p].operation);
                        }
                        if (ops.indexOf(permissions[p].operation) === -1) {
                            ops.push(permissions[p].operation);
                        }
                    }

                    var table = '<table><tr>';
                    table += '</tr>';
                    for (var g in that.aclGroups) {
                        if (!that.aclGroups.hasOwnProperty(g)) continue;
                        //that.aclGroups[g].sort(sortFunction);
                        table += '<tr class="group-titles"><td colspan="' + ops.length + '">' + _(g + ' permissions') + '</td></tr>';
                        table += '<tr class="group-sub-titles">';
                        for (var pp = 0; pp < ops.length; pp++) {
                            if (that.aclGroups[g].indexOf(ops[pp]) !== -1) {
                                table += '<td>' + ops[pp] + '</td>';
                            } else {
                                table += '<td></td>';
                            }
                        }
                        table += '</tr>';
                        table += '<tr>';
                        for (var t = 0; t < ops.length; t++) {
                            if (that.aclGroups[g].indexOf(ops[t]) !== -1) {
                                var id = 'acl_' + g + '_' + t;
                                table += '<td><input id="' + id + '" data-type="' + g + '" data-operation="' + ops[t] + '" class="edit-group-permissions filled-in"  type="checkbox" checked="checked" /><span for="' + id + '"></span></td>';
                            } else {
                                table += '<td></td>';
                            }
                        }
                        table += '</tr>';
                    }
                    table += '</table>';
                    $dialog.find('#tab-users-dialog-new-rights').html(table);

                    // workaround for materialize checkbox problem
                    $dialog.find('input[type="checkbox"]+span').off('click').on('click', function () {
                        var $input = $(this).prev();
                        if (!$input.prop('disabled')) {
                            $input.prop('checked', !$input.prop('checked')).trigger('change');
                        }
                    });

                    $dialog.find('input[type="checkbox"]').off('change').on('change', function () {
                        checkValidId($dialog);
                    });

                    fillAcl(oldId, options.acl);

                    M.updateTextFields('#tab-users-dialog-new');
                });
            } else {
                fillAcl(oldId, options.acl);
                M.updateTextFields('#tab-users-dialog-new');
            }

            $dialog.find('ul.tabs .tab-dialog-new-tabs').show();
        } else {
            $dialog.find('ul.tabs .tab-dialog-new-tabs').each(function () {
                if ($(this).find('a[href="#tab-users-dialog-new-rights"]').length) {
                    $(this).hide();
                }
            });
            M.updateTextFields('#tab-users-dialog-new');
        }
        $dialog.find('ul.tabs').mtabs();
        if (!that.main.noSelect) {
            $dialog.find('ul.tabs').mtabs('select', 'tab-users-dialog-new-main');
        }

        $dialog.modal().modal('open');
    }

    function setupDraggable() {
        that.$gridUsers.find('ul')//table.treetable tbody')
            .sortable({
                connectWith:    '#tab-users .tab-users-list-groups .treetable',
                items:          '.users-type-draggable',
                appendTo:       that.$gridUsers,
                refreshPositions: true,
                helper:         function (e, $target) {
                    return $('<div class="users-drag-helper">' + $target.find('.treetable-icon-empty+span').text() + '</div>');
                },
                zIndex:         999990,
                revert:         false,
                scroll:         false,
                start:          function (e, ui) {
                    var $prev = ui.item.prev();
                    // place this item back where it was
                    ui.item.data('prev', $prev);
                    that.$grid.addClass('dragging');
                },
                stop:           function (e, ui) {
                    that.$grid.removeClass('dragging');
                },
                update: function (event, ui) {
                    // place this item back where it was
                    var $prev = ui.item.data('prev');
                    if (!$prev || !$prev.length) {
                        $(this).prepend(ui.item);
                    } else {
                        $($prev).after(ui.item);
                    }
                }
            })
            .disableSelection();
    }

    function setupDroppable() {
        var $table = that.$gridGroups.find('ul>li');
        if ($table.droppable('instance')) {
            $table.droppable('destroy');
        }
        $table.droppable({
            accept: '.users-type-draggable',
            over: function (e, ui) {
                $(this).addClass('tab-accept-item');
                if ($(this).hasClass('not-empty') && !$(this).hasClass('expanded')) {
                    var id = $(this).data('tt-id');
                    var timer;
                    if ((timer = $(this).data('timer'))) {
                        clearTimeout(timer);
                    }
                    $(this).data('timer', setTimeout(function () {
                        that.$gridGroups.treeTable('expand', id);
                    }, 1000));
                }
            },
            out: function (e, ui) {
                $(this).removeClass('tab-accept-item');
                var timer;
                if ((timer = $(this).data('timer'))) {
                    clearTimeout(timer);
                    $(this).data('timer', null);
                }
            },
            tolerance: 'pointer',
            drop: function (e, ui) {
                $(this).removeClass('tab-accept-item');
                var id = ui.draggable.data('tt-id');
                var enumId = $(this).data('tt-id');

                that.main.socket.emit('getObject', enumId, function (err, obj) {
                    if (obj && obj.common) {
                        obj.common.members = obj.common.members || [];
                        var pos = obj.common.members.indexOf(id);
                        if (pos === -1) {
                            obj.common.members.push(id);
                            obj.common.members.sort();
                            that.main.socket.emit('setObject', obj._id, obj, function (err) {
                                if (!err) {
                                    showMessage(_('%s added to %s', id, obj._id));
                                } else {
                                    showMessage(_('Error: %s', err), true);
                                }
                            });
                        } else {
                            showMessage(_('Is yet in the list'));
                        }
                    }
                });
            }
        });
    }

    function buildUserList() {
        that.list.sort();
        that.groups.sort();
        var text = '';/*'<div class="tree-table-buttons m">' +
            '<a class="btn-floating waves-effect waves-light blue btn-custom-0" title="' + _('New user') + '" id="tab-users-btn-new-user">' +
            '<i class="material-icons">person_add</i></a></div>';*/

        text += '<ul class="collection">';
        var users = getUsersGroups(that.main.objects, that.groups);
        for (var u = 0; u < that.list.length; u++) {
            var name;
            var common;
            if (that.main.objects[that.list[u]] && that.main.objects[that.list[u]].common) {
                common = that.main.objects[that.list[u]].common
            } else {
                common = {};
            }
            if (that.list[u] === 'system.user.admin') {
                common.enabled = true;
            }

            if (common.name) {
                name = translateName(common.name);
            } else {
                name = firstUpper(that.list[u].replace(/^system\.user\./));
            }

            var tGroups = '';
            if (users[that.list[u]]) {
                var groups = users[that.list[u]];
                for (var gg = 0; gg < groups.length; gg++) {
                    var gId = groups[gg].id;
                    var gName = translateName(groups[gg].name);
                    tGroups += '<div class="chip">' + that.main.getIcon(gId) + gName + '<i class="close material-icons tab-users-remove-group" data-group="' + gId + '" data-user="' + that.list[u] + '">close</i></div>';
                }
            }
            var style = '';
            var inverted = false;
            if (common.color) {
                style = 'background: ' + common.color  + '; ';
                if (that.main.invertColor(common.color)) {
                    inverted = true;
                    style += 'color: white;';
                }
            }
            var desc = common.desc;
            if (typeof desc === 'object') {
                desc = desc[systemLang] || desc.en;
            }

            text += '<li class="collection-item avatar users-type-draggable ' + (inverted ? 'inverted' : '') + '" data-tt-id="' + that.list[u] + '" style="' + style + '">';
            text += '   ' + (that.main.getIcon(that.list[u], null, null, 'icon') || '<img class="icon" src="img/account_circle.png"/>');
            text += '<span class="title">' + name + '</span>';
            text += '<p>' + that.list[u] + ((desc ? ' (' + desc + ')' : '') || '') + '</p>';
            text += '   <a class="secondary-content ' + (!common.dontDelete ? 'tab-users-enabled-user' : 'disabled') + '" data-user="' + that.list[u] + '"><i class="material-icons">' + (common.enabled ? 'check_box' : 'check_box_outline_blank') + '</i></a>';
            text += '   <a class="edit-content" data-user="' + that.list[u] + '"><i class="material-icons">edit</i></a>';
            text += '   <a class="delete-content' + (common.dontDelete ? ' disabled' : '') + '" data-user="' + that.list[u] + '"><i class="material-icons">delete</i></a><br>';
            text += (tGroups ? tGroups : '');
            text += '</li>';
        }
        text += '</ul>';
        that.$gridUsers.html(text);
        that.$grid.find('#tab-users-btn-new-user').on('click', function () {
            createOrEdit(false);
        });
        that.$gridUsers.find('.tab-users-enabled-user').on('click', function () {
            var id = $(this).data('user');
            if (id === 'system.user.admin') {
                showMessage(_('Cannot disable admin!'), true);
                return false;
            }
            var $this = $(this);
            var enabled = that.main.objects[id] && that.main.objects[id].common && that.main.objects[id].common.enabled;
            enabled = !enabled;
            that.main.socket.emit('extendObject', id, {common: {enabled: enabled}}, function (err) {
                if (err) {
                    showMessage(_('Cannot modify user!') + err, true);
                } else {
                    showMessage(_('Updated'));
                    $this.find('i').text(enabled ? 'check_box' : 'check_box_outline_blank');
                }
            });
        });
        that.$gridUsers.find('.delete-content').off('click').on('click', function () {
            var id = $(this).data('user');

            if ($(this).hasClass('disabled')) return;

            if (that.main.objects[id] && that.main.objects[id].type === 'user') {
                that.main.confirmMessage(_('Are you sure to delete %s?', id), null, 'help', function (result) {
                    // If all
                    if (result) {
                        deleteUser(id);
                    }
                });
            } else {
                showMessage(_('Object "<b>%s</b>" does not exists. Update the page.', id), true);
            }
        });
        that.$gridUsers.find('.edit-content').on('click', function () {
            createOrEdit($(this).data('user'));
        });
        that.$gridUsers.find('.tab-users-remove-group').on('click', function () {
            var id = $(this).data('user');
            var gId = $(this).data('group');
            // delete user from group
            that.main.socket.emit('getObject', gId, function (err, obj) {
                if (obj && obj.common && obj.common.members) {
                    var pos = obj.common.members.indexOf(id);
                    if (pos !== -1) {
                        obj.common.members.splice(pos, 1);
                        that.main.socket.emit('setObject', obj._id, obj, function (err) {
                            if (!err) {
                                showMessage(_('Removed'));
                            } else {
                                showMessage(_('Error: %s', err), true);
                            }
                        });
                    } else {
                        showMessage(_('%s is not in the list'), true);
                    }
                }
            });
        });
    }

    function buildGroupsList() {
        var text = '';/*'<div class="tree-table-buttons m">' +
            '<a class="btn-floating waves-effect waves-light blue btn-custom-0" title="' + _('New group') + '" id="tab-users-btn-new-group">' +
            '<i class="material-icons">group_add</i></a></div>';*/

        text += '<ul class="collection">';
        for (var u = 0; u < that.groups.length; u++) {
            var name;
            var common;
            if (that.main.objects[that.groups[u]] && that.main.objects[that.groups[u]].common) {
                common = that.main.objects[that.groups[u]].common
            } else {
                common = {};
            }
            if (common.name) {
                name = translateName(common.name);
            } else {
                name = firstUpper(that.groups[u].replace(/^system\.group\./));
            }

            var tUsers = '';
            if (common.members && common.members.length) {
                var users = common.members;
                for (var gg = 0; gg < users.length; gg++) {
                    var uId = users[gg];
                    var uName;
                    if (that.main.objects[uId] && that.main.objects[uId].common && that.main.objects[uId].common.name) {
                        uName = translateName(that.main.objects[uId].common.name);
                    } else {
                        uName = firstUpper(uId.replace(/^system\.user\./));
                    }
                    tUsers += '<div class="chip">' + that.main.getIcon(uId) + uName + '<i class="close material-icons tab-users-remove-user" data-group="' + that.groups[u] + '" data-user="' + uId + '">close</i></div>';
                }
            }
            var style = '';
            var inverted = false;
            if (common.color) {
                style = 'background: ' + common.color  + '; ';
                if (that.main.invertColor(common.color)) {
                    inverted = true;
                    style += 'color: white;';
                }
            }
            var desc = common.desc;
            if (typeof desc === 'object') {
                desc = desc[systemLang] || desc.en;
            }

            text += '<li class="collection-item avatar ' + (inverted ? 'inverted' : '') + '" data-tt-id="' + that.groups[u] + '" style="' + style + '">';
            // text += '   <img src="images/yuna.jpg" alt="" class="icon">';
            text += '   ' + (that.main.getIcon(that.groups[u], null, null, 'icon') || '<img class="icon" src="img/group.png"/>');
            text += '   <span class="title">' + name + '</span>';
            text += '   <p>' + that.groups[u] + ((desc ? ' (' + desc + ')' : '') || '') + '</p>';
            text += '   <a class="edit-content" data-group="' + that.groups[u] + '"><i class="material-icons">edit</i></a>';
            text += '   <a class="delete-content' + (common.dontDelete ? ' disabled' : '') + '" data-group="' + that.groups[u] + '"><i class="material-icons">delete</i></a><br>';
            text += (tUsers ? tUsers : '');
            text += '</li>';
        }
        text += '</ul>';
        that.$gridGroups.html(text);
        that.$grid.find('#tab-users-btn-new-group').on('click', function () {
            createOrEdit(true);
        });
        that.$gridGroups.find('.delete-content').on('click', function () {
            var id = $(this).data('group');
            if ($(this).hasClass('disabled')) return;

            if (that.main.objects[id] && that.main.objects[id].type === 'group') {
                that.main.confirmMessage(_('Are you sure to delete %s?', id), null, 'help', function (result) {
                    // If all
                    if (result) {
                        deleteGroup(id);
                    }
                });
            } else {
                showMessage(_('Object "<b>%s</b>" does not exists. Update the page.', id), true);
            }
        });
        that.$gridGroups.find('.edit-content').on('click', function () {
            createOrEdit($(this).data('group'));
        });
        that.$gridGroups.find('.tab-users-remove-user').on('click', function () {
            var id = $(this).data('user');
            var gId = $(this).data('group');
            // delete user from group
            that.main.socket.emit('getObject', gId, function (err, obj) {
                if (obj && obj.common && obj.common.members) {
                    var pos = obj.common.members.indexOf(id);
                    if (pos !== -1) {
                        obj.common.members.splice(pos, 1);
                        if (!obj._id) {
                            console.error('INVLAID ID');
                            return;
                        }
                        that.main.socket.emit('setObject', obj._id, obj, function (err) {
                            if (!err) {
                                showMessage(_('Removed'));
                            } else {
                                showMessage(_('Error: %s', err), true);
                            }
                        });
                    } else {
                        showMessage(_('%s is not in the list'), true);
                    }
                }
            });
        });
    }

    this._postInit = function () {
        // extract all groups
        buildUserList();
        setupDraggable();
        buildGroupsList();
        setupDroppable();
    };

    // ----------------------------- Users show and Edit ------------------------------------------------
    this.init = function (update) {
        if (this.inited && !update) {
            return;
        }

        if (typeof this.$gridUsers !== 'undefined') {
            this._postInit();
        }
        if (!this.inited) {
            showMessage(_('You can drag&drop users to groups'), 5000);
            this.inited = true;
            this.main.subscribeObjects('system.user.*');
            this.main.subscribeObjects('system.group.*');
        }
    };

    this.destroy = function () {
        if (this.inited) {
            this.inited = false;
            this.main.unsubscribeObjects('system.user.*');
            this.main.unsubscribeObjects('system.group.*');
        }
    };

    this.objectChange = function (id, obj, action) {
        if (id.match(/^system\.user\./)) {
            if (obj) {
                if (this.list.indexOf(id) === -1) this.list.push(id);
            } else {
                var j = this.list.indexOf(id);
                if (j !== -1) this.list.splice(j, 1);
            }

            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(function () {
                that.timer = null;
                that._postInit();
            }, 200);
        } else
        if (id.match(/^system\.group\./)) {
            if (obj) {
                if (this.groups.indexOf(id) === -1) this.groups.push(id);
            } else {
                var i = this.groups.indexOf(id);
                if (i !== -1) this.groups.splice(i, 1);
            }
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(function () {
                that.timer = null;
                that._postInit();
            }, 200);
        }
    };
}

