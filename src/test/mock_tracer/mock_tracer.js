import MockSpan from './mock_span';
import Report from './report';

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
        this._spans.push(span);

        if (fields.references) {
            for (let i = 0; i < fields.references; i++) {
                span.addReference(fields.references[i]);
            }
        }

        // Capture the stack at the time the span started
        span._startStack = new Error().stack;

        return span;
    }

    inject(span, format, carrier) {
        throw new Error('NOT YET IMPLEMENTED');
    }

    extract(format, carrier) {
        throw new Error('NOT YET IMPLEMENTED');
    }

    flush(callback) {
        this.clear();
        if (callback) {
            callback(null);
        }
    }

    //------------------------------------------------------------------------//
    // MockTracer-specific
    //------------------------------------------------------------------------//

    constructor() {
        this._tracerInterface = null;
        this._spans = [];
    }

    _allocSpan() {
        return new MockSpan(this);
    }

    /**
     * Discard any buffered data.
     */
    clear() {
        this._spans = [];
    }

    /**
     * Return the buffered data in a format convenient for making unit test
     * assertions.
     */
    report() {
        return new Report(this._spans);
    }
}
