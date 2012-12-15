var http = require('http');
var Stream = require('stream');

exports = module.exports = function (cb) {
    var server = http.createServer(cb);
    server.on('connection', onconnection);
    server.on('upgrade', function () {});
    return server;
};

exports.onconnection = onconnection;

function onconnection (con) {
    var buffers = [];
    
    var ondata = con.ondata;
    con.ondata = function (buf, start, end) {
        buffers.push([ buf, start, end ]);
        if (!upgraded) return ondata.apply(this, arguments);
    };
    
    var onend = con.onend;
    con.onend = function () {
        buffers = undefined;
        if (!upgraded) return onend.apply(this, arguments);
    };
    
    var upgraded = false;
    
    var onIncoming = con.parser.onIncoming;
    con.parser.onIncoming = function (incoming) {
        incoming.createRawStream = function () {
            upgraded = true;
            
            var bufs = buffers;
            var s = createStream();
            s.buffers = buffers;
            
            process.nextTick(function () {
                for (var i = 0; i < bufs.length; i++) {
                    var b = bufs[i];
                    if (b[2] - b[1] > 0) {
                        s.emit('data', b[0].slice(b[1], b[2]));
                    }
                }
                bufs = undefined;
                s.buffers = undefined;
            });
            
            return s;
        };
        
        incoming.createRawBodyStream = function () {
            upgraded = true;
            
            var bufs = buffers;
            process.nextTick(function () {
                var b = bufs[bufs.length-1];
                var slag = String(b[0].slice(b[1],b[2]))
                    .split(/\r\n\r\n|\n\n/)
                ;
                var b = slag[slag.length-1];
                if (b.length > 0) {
                    s.emit('data', Buffer(b));
                }
            });
            
            var s = createStream();
            return s;
        };
        
        onIncoming.apply(this, arguments);
        
        process.nextTick(function () {
            buffers = undefined;
        });
        
        function createStream () {
            con.parser.onerror = function () {};
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
    };
}
