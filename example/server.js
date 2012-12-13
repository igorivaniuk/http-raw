var createServer = require('../');
var through = require('through');

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
server.listen(7000);

function upper () {
    return through(function (buf) {
        this.emit('data', String(buf).toUpperCase());
    });
}
