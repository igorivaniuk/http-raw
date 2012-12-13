var http = require('http');
var Stream = require('stream');

module.exports = function (cb) {
    var server = http.createServer(cb);
    server.on('connection', onconnection);
    server.on('upgrade', function () {});
    return server;
};

function onconnection (c) {
    var buffers = [];
    
    var ondata = c.ondata;
    c.ondata = function (buf, start, end) {
        buffers.push([ buf, start, end ]);
        return ondata.apply(this, arguments);
    };
    
    var onHeadersComplete = c.parser.onHeadersComplete;
    c.parser.onHeadersComplete = function () {
        onHeadersComplete.apply(this, arguments);
        c.ondata = ondata;
    };
    
    var onIncoming = c.parser.onIncoming;
    c.parser.onIncoming = function (incoming) {
        incoming.createRawStream = function () {
            var bufs = buffers;
            var s = incoming.createRawBodyStream();
            
            process.nextTick(function () {
                for (var i = 0; i < bufs.length; i++) {
                    var b = bufs[i];
                    s.emit('data', b[0].slice(b[1], b[2]));
                }
                bufs = undefined;
            });
            
            return s;
        };
        
        incoming.createRawBodyStream = function () {
            process.nextTick(function () {
                buffers = undefined;
            });
            
            incoming.upgradeOrConnect = true;
            incoming.upgrade = true;
            incoming.shouldKeepAlive = true;
            
            return incoming.connection;
        };
        
        onIncoming.apply(this, arguments);
    };
}
