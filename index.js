var http = require('http');
var Stream = require('stream');

exports = module.exports = function (cb) {
    var server = http.createServer(cb);
    server.on('connection', onconnection);
    server.on('upgrade', function () {});
    return server;
};

exports.onconnection = onconnection;

function onconnection (c) {
    var buffers = [];
    
    var ondata = c.ondata;
    c.ondata = function (buf, start, end) {
        buffers.push([ buf, start, end ]);
        return ondata.apply(this, arguments);
    };
    
    var onend = c.onend;
    c.onend = function () {
        buffers = undefined;
        onend.apply(this, arguments);
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
            incoming.upgradeOrConnect = true;
            incoming.upgrade = true;
            incoming.shouldKeepAlive = true;
            
            var s = new Stream;
            s.writable = true;
            s.readable = true;
            
            var c = incoming.connection;
            s.write = c.write.bind(c);
            s.end = c.end.bind(c);
            s.destroy = c.destroy.bind(c);
            s.pause = c.pause.bind(c);
            s.resume = c.resume.bind(c);
            
            c.on('drain', function () { s.emit('drain') });
            c.on('end', function () { s.emit('end') });
            c.on('close', function () { s.emit('close') });
            c.on('error', function (err) { s.emit('close') });
            c.on('data', function (buf) { s.emit('data', buf) });
            
            return s;
        };
        
        onIncoming.apply(this, arguments);
        
        process.nextTick(function () {
            c.ondata = ondata;
            buffers = undefined;
        });
    };
}
