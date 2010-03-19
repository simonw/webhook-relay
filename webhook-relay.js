var PORT = 8056;
var MAX_PARALLEL_REQUESTS = 10;

require.paths.unshift(__dirname + '/lib/support/djangode');
require.paths.unshift(__dirname + '/lib/support/restler/lib');

var sys = require('sys'), 
    http = require('http'),
    url_mod = require('url'),
    events = require('events'),
    rest = require('restler'),
    dj = require('djangode')
;

var webhook_queue = [];
var webhook_stats = {
    num_requests_recieved: 0,
    num_requests_sent_ok: 0,
    num_requests_sent_error: 0,
    host_stats: {}
}

function Worker() {
    this.busy = false;
}
Worker.prototype.grab_task = function() {
    if (this.busy) {
        return false;
    }
    var task = webhook_queue.pop();
    var self = this;
    if (task) {
        // Equivalent of r = rest.get(url):
        function done(body, response) {
            self.busy = false;
            var firstchar = ('' + response.statusCode)[0];
            if (firstchar == '2' || firstchar == '3') {
                webhook_stats.num_requests_sent_ok += 1;
            } else {
                webhook_stats.num_requests_sent_error += 1;
            }
        };
        var options = {};
        if (task.data) {
            options.data = task.data;
        }
        var r = rest[task.method.toLowerCase()](task.url, options);
        r.addListener('complete', done).addListener('error', done);
        this.busy = true;
    }
    return true;
}

var workers = [];
for (var i = 0; i < MAX_PARALLEL_REQUESTS; i++) {
    workers.push(new Worker());
}

setInterval(function() {
    if (webhook_queue.length) {
        for (var i = 0, worker; worker = workers[i]; i++) {
            worker.grab_task();
        }
    }
}, 100); // Every tenth of a second

var app = dj.makeApp([
    ['^/$', function(req, res) {
        var s = 'Server stats:\n\n';
        [
            'num_requests_recieved',
            'num_requests_sent_ok',
            'num_requests_sent_error'
        ].forEach(function(key) {
            s += (key + ': ' + webhook_stats[key] + '\n');
        });
        dj.respond(res, s, 'text/plain');
    }],
    ['^/relay/?$', function(req, res) {
        webhook_stats.num_requests_recieved += 1;
        dj.extractPost(req, function(post) {
            if (!post.url) {
                dj.respond(res, 'Error: URL is missing', 'text/plain');
                return;
            }
            var task = {
                'url': post.url,
                'method': post.method || 'POST',
            }
            if (post.data) {
                task.data = JSON.parse(post.data);
            }
            webhook_queue.push(task);
            dj.respond(res, 'OK', 'text/plain');
        });
    }],
    ['^/favicon\.ico$', function(req, res) {
        dj.respond(res, 'Nothing to see here');
    }]
]);
dj.serve(app, PORT);
