var https = require('https');
var httpRaw = require('../');
var createServer = httpRaw.fromServer(https.createServer)
var request = require('request');

var through = require('through');
var test = require('tap').test;
var net = require('net');

var server = createServer(function (req, res) {
    res.end('beep boop');
});
server.listen(0);
var port = server.address().port;

server.on('listening', function () {
    test('simple GET', getTest);
    
    test(function (t) {
        server.close();
        t.end();
    });
});

function getTest (t) {
    t.plan(1);
    
    request('https://localhost:' + port, function (err, res, body) {
        t.equal(body, 'beep boop');
    });
}
