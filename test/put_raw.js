var createServer = require('../');
var through = require('through');
var test = require('tap').test;
var net = require('net');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop\n');
    }
    else {
        var rs = req.createRawStream();
        rs.pipe(process.stdout, { end : false });
        
        var bs = req.createRawBodyStream();
        bs.pipe(upper()).pipe(bs)
    }
});
server.listen(0);
var port = server.address().port;

server.on('listening', function () {
    test('simple GET', getTest);
    test('raw PUT', putTest);
    
    test(function (t) {
        server.close();
        t.end();
    });
});

function getTest (t) {
    t.plan(1);
    t.pass();
}

function putTest (t) {
    t.plan(1);
    t.pass();
}

function upper () {
    return through(function (buf) {
        this.emit('data', String(buf).toUpperCase());
    });
}
