import { MockTracer, MockSpan } from './mock_tracer';

/**
 * Extend the MockSpan to include LightStep-specific API implementations
 */
class LightStepMockSpan extends MockSpan {

    getOperationName() {
        return this._operationName;
    }

    beginMicros() {
        return this._startMs * 1000;
    }
    setBeginMicros(us) {
        this._startMs = us / 1000;
    }

    endMicros() {
        return this.finishMs * 1000;
    }
    setEndMicros(us) {
        this._finishMs = us / 1000;
    }

    generateTraceURL() {
        return 'https://example.com/lightstep/mock_span/';
    }
}

/**
 * Extend the MockTracer to include LightStep-specific API implementations
 */
export default class LightStepMockTracer extends MockTracer {
    _allocSpan(fields) {
        return new LightStepMockSpan(this);
    }
}

// Workaround to avoid require('package').default in ES5.
module.exports = module.exports.default;
