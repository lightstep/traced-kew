'use strict';

var _ = require('../..');

var _2 = _interopRequireDefault(_);

var _opentracing = require('opentracing');

var _opentracing2 = _interopRequireDefault(_opentracing);

var _lightstepTracerNodeDebug = require('lightstep-tracer/dist/lightstep-tracer-node-debug.js');

var _lightstepTracerNodeDebug2 = _interopRequireDefault(_lightstepTracerNodeDebug);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-console, no-shadow */

//import * as Q from 'kew';
require('source-map-support').install();

// Command-line argument for demo purposes
var shouldFail = process.argv[2] === 'fail';

//
// Standard OpenTracing tracer initialization
//
_opentracing2.default.initGlobalTracer(_lightstepTracerNodeDebug2.default.tracer({
    access_token: '{your_access_token}',
    component_name: 'kew'
}));

//
// Helper function - create simple timeout promises as mocks for
// real asynchronous operations.
//
function mockAsyncOperation(ms, span, fail) {
    var defer = _2.default.tracedDefer('Async operation (' + ms + 'ms)', span);
    setTimeout(function () {
        if (fail) {
            defer.span().logEvent('Intentional failure!', {
                stack: new Error().stack.split(/\n/)
            });
            defer.reject('Failure! ' + ms);
        } else {
            defer.resolve(ms);
        }
    }, ms);
    return defer.promise;
}

//
// Example Promise chaining
//

// NOTE: the tracedAll implementation currently requires the "parent" span to be
// created before promises passed into tracedAll(). This is a temporary
// restriction. OpenTracing supports a "follow from" relationship we can build
// upon to remove the need to manually create a span.
var span = _opentracing2.default.startSpan('Q.all');

_2.default.tracedAll(span, [mockAsyncOperation(35, span), mockAsyncOperation(150, span), mockAsyncOperation(200, span), mockAsyncOperation(100, span), mockAsyncOperation(125, span)]).tracedSpread(function (span, result1, result2) {
    console.log('Ok: ' + result1 + ' ' + result2);
    return mockAsyncOperation(40);
}).tracedThen(function (span) {
    span.setOperationName('nested');
    return _2.default.tracedAll(span, [mockAsyncOperation(8, span, shouldFail), mockAsyncOperation(18, span), mockAsyncOperation(12, span)]);
}).tracedThen(function (span, result) {
    // ^^^ the "traced" prefixed methods operate the same as the normal
    // kew methods, but will also pass the active span.  This can be used
    // to customize the span, or to branch off sub-operations.
    span.setOperationName('tracedThen (custom name)');
    span.logEvent('tracedThen prepends the span object to the callback arguments');
    span.logEvent('Result was ' + result);

    console.log('second_then');
    return mockAsyncOperation(70);
}).fail(function (err) {
    console.error('Error: ' + err);
    return mockAsyncOperation(25);
}).finish(function (span) {
    // ^^^ an additional finish() call it needed to let close out the
    // chained spans
    var url = span.imp().generateTraceURL();
    console.log(url);
    _shelljs2.default.exec('open "' + url + '"');
});

//# sourceMappingURL=demo.js.map