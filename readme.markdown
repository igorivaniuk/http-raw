# http-raw

expose the raw request data in an http server

# example

``` js
var createServer = require('http-raw');
var through = require('through');

var server = createServer(function (req, res) {
    if (req.method === 'GET') {
        res.end('beep boop\n');
    }
    else {
        var bs = req.createRawBodyStream();
        bs.write('HTTP/1.1 200 OK\r\n\r\n');
        bs.pipe(upper()).pipe(bs)
    }
});
server.listen(7000);

function upper () {
    return through(function (buf) {
        this.emit('data', String(buf).toUpperCase());
    });
}
```

```
$ node example/server.js &
$ nc localhost 7000
PUT / HTTP/1.1
Host: robots

HTTP/1.1 200 OK


beep 
BEEP
boop
BOOP
```

# methods

``` js
var createServer = require('http-raw')
```

The http-raw api is exactly like the `http.createServer(cb)` api from core,
except that 2 extra functions are available on the `req` objects from the
`cb(req,res)` handler:

## req.createRawStream()

Return a readable/writable stream `s`. `s` will emit all the raw data from the
connection, including the buffered header data without doing any parsing on the
data beforehand.

Writing to `s` goes through to the underlying network socket without any
additional framing applied.

## var s = req.createRawBodyStream()

Return a readable/writable stream `s`. `s` will emit the raw data from after the
headers have been parsed, including any framing without doing any parsing.

Writing to `s` goes through to the underlying network socket without any
additional framing applied.

# install

With [npm](https://npmjs.org) do:

```
npm install http-raw
```

# license

MIT
