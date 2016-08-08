/* eslint-disable no-console, no-shadow, import/no-extraneous-dependencies */
import Tracer from 'opentracing';
import LightStep from 'lightstep-tracer/dist/lightstep-tracer-node-debug.js';
import shelljs from 'shelljs';

//import * as Q from 'kew';
import Q from '../..';

require('source-map-support').install();

// Command-line argument for demo purposes
const shouldFail = (process.argv[2] === 'fail');

//
// Standard OpenTracing tracer initialization
//
Tracer.initGlobalTracer(LightStep.tracer({
    access_token   : '{your_access_token}',
    component_name : 'kew',
}));

//
// Helper function - create simple timeout promises as mocks for
// real asynchronous operations.
//
function mockAsyncOperation(ms, span, fail) {
    let defer = Q.tracedDefer(`Async operation (${ms}ms)`, span);
    setTimeout(() => {
        if (fail) {
            defer.span().logEvent('Intentional failure!', {
                stack : new Error().stack.split(/\n/),
            });
            defer.reject(`Failure! ${ms}`);
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
let span = Tracer.startSpan('Q.all');

Q.tracedAll(span, [
    mockAsyncOperation(35, span),
    mockAsyncOperation(150, span),
    mockAsyncOperation(200, span),
    mockAsyncOperation(100, span),
    mockAsyncOperation(125, span),
])
    .tracedSpread((span, result1, result2) => {
        console.log(`Ok: ${result1} ${result2}`);
        return mockAsyncOperation(40);
    })
    .tracedThen((span) => {
        span.setOperationName('nested');
        return Q.tracedAll(span, [
            mockAsyncOperation(8, span, shouldFail),
            mockAsyncOperation(18, span),
            mockAsyncOperation(12, span),
        ]);
    })
    .tracedThen((span, result) => {
        // ^^^ the "traced" prefixed methods operate the same as the normal
        // kew methods, but will also pass the active span.  This can be used
        // to customize the span, or to branch off sub-operations.
        span.setOperationName('tracedThen (custom name)');
        span.logEvent('tracedThen prepends the span object to the callback arguments');
        span.logEvent(`Result was ${result}`);

        console.log('second_then');
        return mockAsyncOperation(70);
    })
    .fail((err) => {
        console.error(`Error: ${err}`);
        return mockAsyncOperation(25);
    })
    .finish((span) => {
        // ^^^ an additional finish() call it needed to let close out the
        // chained spans
        const url = span.imp().generateTraceURL();
        console.log(url);
        shelljs.exec(`open "${url}"`);
    });
