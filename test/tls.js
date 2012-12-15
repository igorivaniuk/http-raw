var fs = require('fs');

var keys = {
    A : fs.readFileSync(__dirname + '/keys/agent1-key.pem'),
    B : fs.readFileSync(__dirname+'/keys/agent1-key.pem'),
    C : fs.readFileSync(__dirname+'/keys/agent2-key.pem'),
    D : fs.readFileSync(__dirname+'/keys/agent2-key.pem'),
};

var certs = {
    A : fs.readFileSync(__dirname+'/keys/agent1-cert.pem'),
    B : fs.readFileSync(__dirname+'/keys/agent1-cert.pem'),
    C : fs.readFileSync(__dirname+'/keys/agent2-cert.pem'),
    D : fs.readFileSync(__dirname+'/keys/agent2-cert.pem'),
};

var options = {
    key : keys.A,
    cert : certs.A,
    ca : [ certs.C, certs.D ],
};

var https = require('https');
var httpRaw = require('../');
var createServer = httpRaw.fromServer(function (cb) {
    return https.createServer(options, cb);
}, 'secureConnection');
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
        if (err) return t.fail(err);
        t.equal(body, 'beep boop');
    });
}
