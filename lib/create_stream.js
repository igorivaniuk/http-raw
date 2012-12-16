var Stream = require('stream');

module.exports = function (con, incoming) {
    if (con.parser) {
        con.parser.onerror = function () {};
    }
    con.ondata = function () {};
    
    incoming.upgradeOrConnect = true;
    incoming.upgrade = true;
    incoming.shouldKeepAlive = true;
    
    var s = new Stream;
    s.writable = true;
    s.readable = true;
    
    var c = incoming.connection;
    
    s.write = c.write.bind(c);
    s.end = c.end.bind(c);
    s.destroy = c.destroy.bind(c);
    s.pause = c.pause.bind(c);
    s.resume = c.resume.bind(c);
    
    c.on('drain', function () { s.emit('drain') });
    
    c.on('end', function () {
        setTimeout(function () {
            s.emit('end');
            close();
        }, 100);
    });
    c.on('close', close);
    
    var closed = false;
    function close () {
        if (closed) return;
        s.emit('close');
        closed = true;
        incoming.destroy();
    }
    
    c.on('error', function (err) { s.emit('close') });
    c.on('data', function (buf) {
        s.emit('data', buf);
    });
    
    return s;
};
