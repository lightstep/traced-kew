/**
 * OpenTracing Context implementation designed for use in
 * unit tests.
 */
export default class MockContext {
    //------------------------------------------------------------------------//
    // OpenTracing API
    //------------------------------------------------------------------------//

    setBaggageItem(key, value) {
        this._baggage[key] = value;
    }

    getBaggageItem(key) {
        return this._baggage[key];
    }

    //------------------------------------------------------------------------//
    // MockContext-specific
    //------------------------------------------------------------------------//

    constructor(spanImp) {
        // Store a reference to the span itself since this is a mock tracer
        // intended to make debugging and unit testing easier.
        this._spanImp = spanImp;
        this._baggage = {};
    }

    spanImp() {
        return this._spanImp;
    }
}
