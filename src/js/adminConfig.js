function Config(main) {
    'use strict';
    var that          = this;
    this.$dialog      = $('#dialog-config');
    this.$configFrame = this.$dialog.find('#config-iframe');
    this.main         = main;

    this.prepare = function () {
        // id = 'system.adapter.NAME.X'
        $iframeDialog = this;
        var eventFunc = window.addEventListener ? 'addEventListener' : 'attachEvent';
        var emit = window[eventFunc];
        var eventName = eventFunc === 'attachEvent' ? 'onmessage' : 'message';

        // receive messages from IFRAME
        emit(eventName, function (event) {
            console.log(event.data);
            if (event.data === 'close' || event.message === 'close') {
                that.main.navigate();
            } else {
                try {
                    window.showConfig = JSON.parse(event.data|| event.message);
                } catch (e) {
                    console.log('Unknown event: ' + (event.data|| event.message));
                }
            }
        }, false);
    };

    this.init = function () {
        if (this.inited) return;

        this.inited = true;


        var id = this.main.navigateGetParams();

        var parts = id.split('.');
        if (this.main.objects[id] && this.main.objects[id].common && this.main.objects[id].common.materialize) {
            this.$configFrame.attr('src', 'adapter/' + parts[2] + '/index_m.html?' + parts[3]);
        } else {
            this.$configFrame.attr('src', 'adapter/' + parts[2] + '/?' + parts[3]);
        }

        var name = id.replace(/^system\.adapter\./, '');
        this.$dialog.data('name', name);
        this.$dialog.find('.title').html(_('Adapter configuration') + ': ' + name);
    };

    this.allStored = function () {
        return !window.frames['config-iframe'].changed;
    };

    // this function is called by the configuration code in iFrame
    this.close = function () {
        that.main.navigate();
    };

    this.destroy = function () {
        if (this.inited) {
            this.inited = false;
            this.$configFrame.attr('src', '');

            // If after wizard some configurations must be shown
           if (typeof showConfig !== 'undefined' && showConfig && showConfig.length) {
               var configId = showConfig.shift();
               setTimeout(function () {
                   that.main.navigate({
                        tab:    'instances',
                        dialog: 'config',
                        params:  configId
                   });
               }, 1000);
           }
        }
    }
}