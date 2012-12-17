var Stream = require('stream');

module.exports = function (req) {
    var c = req.connection;
    if (c.parser) {
        c.parser.onerror = function () {};
    }
    c.ondata = function () {};
    
    var s = new Stream;
    s.readable = true;
    
    s.pause = c.pause.bind(c);
    s.resume = c.resume.bind(c);
    
    c.on('data', s.emit.bind(s, 'data'));
    c.on('end', s.emit.bind(s, 'end'));
    c.on('close', close);
    c.on('drain', s.emit.bind(s, 'drain'));
    c.on('error', close);
    
    var closed = false;
    function close () {
        if (closed) return;
        s.emit('close');
        closed = true;
        req.destroy();
    }
    
    return s;
};
