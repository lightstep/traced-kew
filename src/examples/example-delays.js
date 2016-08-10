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
    collector_host : 'localhost',
    collector_port : 9998,
    collector_encryption : 'none',
}));


opentracing.imp().on('report', (report) => {
    require('fs').writeFileSync('temp/spans.json', JSON.stringify(report.span_records, null, 4));
});

function done(err, span) {
    if (err) {
        throw err;
    }
    const url = span.imp().generateTraceURL().replace(/https:\/\/app\.lightstep\.com/, 'http://localhost:10000')
    console.log(url);
    span.finish();

    shelljs.exec(`open "${url}"`);
}

Q.tracedDelay('root', null, 2)
    .then(()=> {
        return Q.tracedDelay('ABC', null, 2)
            .then(() => Q.tracedDelay('A', null, 2))
            .then(() => Q.tracedDelay('B', null, 1))
            .then(() => Q.tracedDelay('C', null, 4))
    })
    .then(()=> {
        return Q.delay(15)
            .then(() => Q.delay(2))
            .then(() => Q.delay(1))
            .then(() => Q.delay(4))
    })
    .tracedThen((span) => {
        done(null, span);
    })
    .fail((err) => {
        done(new Error(err));
    });
