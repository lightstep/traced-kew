/* eslint-disable import/no-extraneous-dependencies */

import opentracing from 'opentracing';
import _ from 'underscore';
import MockContext from './mock_context';

/**
 * OpenTracing Span implementation designed for use in
 * unit tests.
 */
export default class MockSpan {

    //------------------------------------------------------------------------//
    // OpenTracing API
    //------------------------------------------------------------------------//

    context() {
        return new MockContext(this);
    }

    tracer() {
        return this._tracer;
    }

    setOperationName(name) {
        this._operationName = name;
    }

    addTags(set) {
        let keys = Object.keys(set);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            this._tags[key] = set[key];
        }
    }

    log(fields) {
        this._logs.push(fields);
    }

    finish(finishTime) {
        this._finishMs = finishTime || Date.now();
    }

    //------------------------------------------------------------------------//
    // MockSpan-specific
    //------------------------------------------------------------------------//

    constructor(tracer) {
        this._tracer = tracer;
        this._uuid = this._generateUUID();
        this._startMs = Date.now();
        this._finishMs = 0;
        this._operationName = '';
        this._tags = {};
        this._logs = [];

        this._childOf = null;
        this._children = [];
        this._followsFrom = null;

        // Capture the stack at the time of startSpan.  Definitely too expensive
        // to be doing in a production tracer, but convenient in the MockTracer
        // for tracking down unfinished spans.
        this._startStack = null;
    }

    uuid() {
        return this._uuid;
    }

    _generateUUID() {
        const p0 = `00000000${Math.abs((Math.random() * 0xFFFFFFFF) | 0).toString(16)}`.substr(-8);
        const p1 = `00000000${Math.abs((Math.random() * 0xFFFFFFFF) | 0).toString(16)}`.substr(-8);
        return `${p0}${p1}`;
    }

    addReference(ref) {
        switch (ref.type()) {
        case opentracing.REFERENCE_CHILD_OF:
            this._childOf = ref.referencedContext().imp().spanImp();
            this._childOf._children.push(this);
            break;
        case opentracing.REFERENCE_FOLLOWS_FROM:
            this._followsFrom = ref.referencedContext().imp().span();
            break;
        default:
            throw new Error(`Unknown reference type  ${ref.type()}`);
        }
    }

    /**
     * Returns a simplified object better for console.log()'ing.
     */
    debug() {
        let obj = {
            uuid      : this._uuid,
            operation : this._operationName,
            millis    : [ this._finishMs - this._startMs, this._startMs, this._finishMs ],
            childOf   : this._childOf,
        };
        if (_.size(this._tags)) {
            obj.tags = this._tags;
        }
        return obj;
    }
}
