var http = require('http');
var https = require('https');
var createReadStream = require('./lib/read');
var createWriteStream = require('./lib/write');

exports = module.exports = fromServer(http.createServer);
exports.http = fromServer(http.createServer);
exports.https = fromServer(https.createServer, 'secureConnection');
exports.fromServer = fromServer;

function fromServer (Server, evName) {
    return function (cb) {
        var server = new Server();
        server.on('request', function (req, res) {
            injectRaw(req);
            res.createRawStream = createWriteStream.bind(null, req);
            if (cb) cb.apply(this, arguments);
        });
        
        server.on(evName || 'connection', onconnection);
        server.on('upgrade', function (req) {
            injectRaw(req);
        });
        return server;
    };
}

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
}

function injectRaw (req) {
    var buffers = req.connection._rawBuffers;
    
    req.createRawStream = function () {
        req.connection._upgraded = true;
        
        var bufs = buffers;
        var s = createReadStream(req);
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
            req.connection._rawBuffers = undefined;
        });
        
        return s;
    };
    
    req.createRawBodyStream = function () {
        req.connection._upgraded = true;
        
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
        
        var s = createReadStream(req);
        return s;
    };
    
    process.nextTick(function () {
        buffers = undefined;
        req.connection._rawBuffers = undefined;
    });
    
}
