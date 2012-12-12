var test = require('tap').test;
var http = require('http');
var createServer = require('../');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop\n');
    }
    else {
        req.createRawStream().pipe(res);
    }
});
server.listen(0);
var port = server.address().port;

test('leak test', function (t) {
    t.plan(101 + 101);
    
    function get50 (cb) {
        var pending = 50;
        for (var i = 0; i < 50; i++) {
            sendGET(function (eq) {
                t.ok(eq, 'expected GET response');
                if (--pending === 0) cb();
            });
        }
    }
    
    function raw50 (cb) {
        var pending = 50;
        for (var i = 0; i < 50; i++) {
            sendPOST(function (eq) {
                t.ok(eq, 'expected POST response');
                if (--pending === 0) cb();
            });
        }
    }
    
    function compareBaseline (fn, cb) {
        fn(function () {
            var baseline = process.memoryUsage().heapUsed;
            
            fn(function () {
                t.ok(
                    process.memoryUsage().heapUsed / baseline > 1.1,
                    'acceptable heap growth'
                );
                if (cb) cb();
            });
        });
    }
    
    compareBaseline(get50, function () {
        compareBaseline(raw50);
    });
    
    t.on('end', function () {
        server.close();
    });
});

function sendGET (cb) {
    var opts = {
        port : port,
        host : 'localhost',
        path : '/',
    };
    http.get(opts, function (res) {
        var data = '';
        res.on('data', function (buf) { data += buf });
        res.on('end', function () {
            cb(data === 'beep boop\n');
        });
    });
}

function sendPOST (cb) {
    var opts = {
        method : 'POST',
        port : port,
        host : 'localhost',
        path : '/',
    };
    var req = http.request(opts, function (res) {
        var data = '';
        res.on('data', function (buf) {
            console.dir(String(buf));
            data += buf
        });
        res.on('end', function () {
            cb(null,
                data.split('\n')[0] === 'GET / HTTP/1.1\r\n'
                && data.split('\n').slice(-1)[0] === 'BEEP BOOP'
            );
        });
    });
    req.end('BEEP BOOP');
}
