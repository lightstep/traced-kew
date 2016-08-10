'use strict';

var _opentracing = require('opentracing');

var _opentracing2 = _interopRequireDefault(_opentracing);

var _lightstepTracer = require('lightstep-tracer');

var _lightstepTracer2 = _interopRequireDefault(_lightstepTracer);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _ = require('../..');

var _2 = _interopRequireDefault(_);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-console, no-shadow, import/no-extraneous-dependencies */
require('source-map-support').install();

//
// Standard OpenTracing tracer initialization
//
_opentracing2.default.initGlobalTracer(_lightstepTracer2.default.tracer({
    access_token: '{your_access_token}',
    component_name: 'traced-kew/example-delays',
    collector_host: 'localhost',
    collector_port: 9998,
    collector_encryption: 'none'
}));

_opentracing2.default.imp().on('report', function (report) {
    require('fs').writeFileSync('temp/spans.json', JSON.stringify(report.span_records, null, 4));
});

function done(err, span) {
    if (err) {
        throw err;
    }
    var url = span.imp().generateTraceURL().replace(/https:\/\/app\.lightstep\.com/, 'http://localhost:10000');
    console.log(url);
    span.finish();

    _shelljs2.default.exec('open "' + url + '"');
}

_2.default.tracedDelay('root', null, 2).then(function () {
    return _2.default.tracedDelay('ABC', null, 2).then(function () {
        return _2.default.tracedDelay('A', null, 2);
    }).then(function () {
        return _2.default.tracedDelay('B', null, 1);
    }).then(function () {
        return _2.default.tracedDelay('C', null, 4);
    });
}).then(function () {
    return _2.default.delay(15).then(function () {
        return _2.default.delay(2);
    }).then(function () {
        return _2.default.delay(1);
    }).then(function () {
        return _2.default.delay(4);
    });
}).tracedThen(function (span) {
    done(null, span);
}).fail(function (err) {
    done(new Error(err));
});

//# sourceMappingURL=example-delays.js.map