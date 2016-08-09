/* eslint-disable no-console, no-shadow, import/no-extraneous-dependencies */
import opentracing from 'opentracing';
import LightStep from 'lightstep-tracer';
import shelljs from 'shelljs';
import Q from '../..';

require('source-map-support').install();

//
// Standard OpenTracing tracer initialization
//
opentracing.initGlobalTracer(LightStep.tracer({
    access_token   : '{your_access_token}',
    component_name : 'traced-kew/example-delays',
}));


function done(err, span) {
    if (err) {
        throw err;
    }
    const url = span.imp().generateTraceURL();
    console.log(url);
    span.finish();

    shelljs.exec(`open "${url}"`);
}

Q.tracedDelay('root', null, 10)
    .then(()=> {
        return Q.tracedDelay('ABC', null, 20)
            .then(() => Q.tracedDelay('A', null, 50))
            .then(() => Q.tracedDelay('B', null, 10))
            .then(() => Q.tracedDelay('C', null, 40))
    })
    .then(()=> {
        return Q.delay(15)
            .then(() => Q.delay(22))
            .then(() => Q.delay(11))
            .then(() => Q.delay(44))
    })
    .tracedThen((span) => {
        done(null, span);
    })
    .fail((err) => {
        done(new Error(err));
    });
