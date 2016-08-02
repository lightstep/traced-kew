import opentracing from 'opentracing';

/**
 * OpenTracing Tracer implementation designed for use in
 * unit tests.
 */
export default class MockTracer {

    //------------------------------------------------------------------------//
    // OpenTracing API
    //------------------------------------------------------------------------//

    setInterface(tracer) {
        this._tracerInterface = tracer;
    }

    startSpan(fields) {
        // _allocSpan is given it's own method so that derived classes can
        // allocate any type of object they want, but not have to duplicate
        // the other common logic in startSpan().
        const span = this._allocSpan(fields);

        span.setOperationName(fields.operationName);
        this._spansByUUID[span.uuid()] = span;

        if (fields.references) {
            for (let i = 0; i < fields.references; i++) {
                span.addReference(fields.references[i]);
            }
        }

        return span;
    }

    inject(span, format, carrier) {
        throw new Error('NOT YET IMPLEMENTED');
    }

    extract(format, carrier) {
        throw new Error('NOT YET IMPLEMENTED');
    }

    flush(callback) {
        const keys = Object.keys(this._spansByUUID);
        const spans = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
            spans[i] = this._spansByUUID[keys[i]];
        }
        this._spansByUUID = {};

        // The _flushCb is a MockTracer specific hook to get the collected
        // data. The callback passed into the function is the OpenTracing API
        // callback which simply signifies when the flush has completed (and
        // whether there was an error or not).
        this._flushCb(spans);

        if (callback) {
            cb(null);
        }
    }

    //------------------------------------------------------------------------//
    // MockTracer-specific
    //------------------------------------------------------------------------//

    constructor({ flush }) {
        this._tracerInterface = null;

        this._spansByUUID = {};
        this._flushCb = flush || function () {};
    }

    _allocSpan() {
        return new MockSpan(this);
    }
}
