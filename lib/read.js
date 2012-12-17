var Stream = require('stream');

module.exports = function (req) {
    var c = req.connection;
    
    var s = new Stream;
    s.readable = true;
    
    s.pause = c.pause.bind(c);
    s.resume = c.resume.bind(c);
    
    c.on('data', s.emit.bind(s, 'data'));
    c.on('end', s.emit.bind(s, 'end'));
    c.on('drain', s.emit.bind(s, 'drain'));
    c.on('error', function () {
        req.destroy();
    });
    
    return s;
};
