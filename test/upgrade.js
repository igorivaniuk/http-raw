var createServer = require('../');
var through = require('through');
var test = require('tap').test;
var net = require('net');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop');
    }
    else {
        var bs = req.createRawBodyStream();
        bs.write('HTTP/1.1 200 OK\r\n\r\n');
        bs.pipe(upper()).pipe(bs)
    }
});
server.listen(0);
var port = server.address().port;

server.on('listening', function () {
    test('upgraded PUT', putUpgradeTest);
    
    test(function (t) {
        server.close();
        t.end();
    });
});

function putUpgradeTest (t) {
    t.plan(1);
    var c = net.connect(port);
    var data = '';
    c.on('data', function (buf) { data += buf });
    c.on('end', function () {
        t.equal(data, 'HTTP/1.1 200 OK\r\n\r\nABC\nDEF\nH\nIJK');
    });
    
    c.write([
        'PUT / HTTP/1.1',
        'Host: beep.boop',
        'Upgrade: true',
        '',
        ''
    ].join('\r\n') + 'abc\ndef\nh\n');
    
    setTimeout(function () {
        c.end('ijk');
    }, 100);
}

function upper () {
    return through(function (buf) {
        this.emit('data', String(buf).toUpperCase());
    });
}
