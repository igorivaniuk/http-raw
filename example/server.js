var createServer = require('../');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop\n');
    }
    else {
        var s = req.createRawStream();
        s.pipe(process.stdout, { end : false });
        s.on('end', function () { res.end('ok\n') });
    }
});
server.listen(7000);
