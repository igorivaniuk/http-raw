var http = require('http');
var Stream = require('stream');

exports = module.exports = fromServer(http.createServer);

exports.fromServer = fromServer;
function fromServer (Server, evName) {
    return function (cb) {
        var server = Server(cb);
        server.on(evName || 'connection', onconnection);
        server.on('upgrade', function (req) {
            injectRaw(req.connection, req);
        });
        return server;
    };
}

exports.onconnection = onconnection;
exports.inject = injectRaw;

function onconnection (con) {
    var buffers = con._rawBuffers = [];
    
    var ondata = con.ondata;
    con.ondata = function (buf, start, end) {
        buffers.push([ buf, start, end ]);
        if (!con._upgraded) return ondata.apply(this, arguments);
    };
    
    var onend = con.onend;
    con.onend = function () {
        buffers = undefined;
        con._rawBuffers = undefined;
        if (!con._upgraded) return onend.apply(this, arguments);
    };
    
    var onIncoming = con.parser.onIncoming;
    con.parser.onIncoming = function (incoming) {
        injectRaw(con, incoming);
        onIncoming.apply(this, arguments);
    };
}

function injectRaw (con, incoming) {
    var buffers = con._rawBuffers;
    
    incoming.createRawStream = function () {
        con._upgraded = true;
        
        var bufs = buffers;
        var s = createStream();
        s.buffers = buffers;
        
        if (buffers) process.nextTick(function () {
            for (var i = 0; i < bufs.length; i++) {
                var b = bufs[i];
                if (b[2] - b[1] > 0) {
                    s.emit('data', b[0].slice(b[1], b[2]));
                }
            }
            bufs = undefined;
            s.buffers = undefined;
            con._rawBuffers = undefined;
        });
        
        return s;
    };
    
    incoming.createRawBodyStream = function () {
        con._upgraded = true;
        
        var bufs = buffers;
        if (buffers) process.nextTick(function () {
            var b = bufs[bufs.length-1];
            var str = String(b[0].slice(b[1],b[2]))
            
            var ix = str.indexOf('\r\n\r\n');
            if (ix >= 0) {
                ix += 4
            }
            else {
                ix = str.indexOf('\n\n');
                if (ix < 0) return;
                ix += 2;
            }
            
            var b = str.slice(ix);
            if (b.length > 0) {
                s.emit('data', Buffer(b));
            }
        });
        
        var s = createStream();
        return s;
    };
    
    process.nextTick(function () {
        buffers = undefined;
        con._rawBuffers = undefined;
    });
    
    function createStream () {
        if (con.parser) {
            con.parser.onerror = function () {};
        }
        con.ondata = function () {};
        
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
        
        c.on('end', function () {
            s.emit('end');
            close();
        });
        c.on('close', close);
        
        var closed = false;
        function close () {
            if (closed) return;
            s.emit('close');
            closed = true;
            incoming.destroy();
        }
        
        c.on('error', function (err) { s.emit('close') });
        c.on('data', function (buf) {
            s.emit('data', buf)
        });
        
        return s;
    }
}
