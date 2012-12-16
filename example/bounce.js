var createServer = require('../');
var http = require('http');
var net = require('net');

var server = createServer(function (req, res) {
    var rs = req.createRawStream();
    rs.pipe(process.stdout,{end:false});
    rs.pipe(net.connect(7001)).pipe(rs);
});
server.listen(7000);

http.createServer(function (req, res) {
    res.end('beep boop\n');
}).listen(7001);
