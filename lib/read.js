var through = require('through');

module.exports = function (c, buffers) {
    c._upgraded = true;
    c.on('error', function () {
        s.destroy();
        c.destroy();
    });
    
    var s = through();
    s.pause();
    buffers.forEach(s.queue.bind(s));
    
    s.pause = (function () {
        var pause = s.pause;
        var paused = false;
        
        process.nextTick(function () {
            if (!paused) s.resume();
        });
        
        return function () {
            paused = true;
            return pause.apply(this, arguments);
        };
    })();
    
    c.pipe(s);
    return s;
};
