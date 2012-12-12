var createServer = require('../');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop\n');
    }
    else {
        var rs = req.createRawStream();
        rs.pipe(process.stdout, { end : false });
        
        var bs = req.createRawBodyStream();
        bs.pipe(bs);
    }
});
server.listen(7000);
