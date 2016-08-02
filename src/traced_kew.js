import * as Q from 'kew';
import Tracer from 'opentracing';

function _randomGUID() {
    return [
        `00000000${((Math.random() * 0xFFFFFFFF)|0).toString(16)}`.substr(-8),
        `00000000${((Math.random() * 0xFFFFFFFF)|0).toString(16)}`.substr(-8),
    ].join('');
}

let uniqueLinkID = 0;
function _joinKey() {
    uniqueLinkID++;
    return `join:linked_trace_${uniqueLinkID}`;
}

function _joinSpans(parent, child) {
    if (!parent || !child) {
        return;
    }
    const joinKey = _joinKey();
    const joinValue = _randomGUID();
    parent.setTag(joinKey, joinValue);
    child.setTag(joinKey, joinValue);
}

/**
 * Holds a reference "tail" span in a chained of linked spans.
 *
 * A linked span in this context is a child span that starts as soon as its
 * parent finishes. This is essentially the "followsFrom" relationship defined
 * in OpenTracing being emulated via "childOf" relationships (due to incomplete
 * support for "followsFrom").
 *
 * The chained spans correspond to the potential chaining of promise calls,
 * as in pseudo-code such as:
 *
 * ```
 * 		Q.all([ promise1, promise2 ])
 * 			.spread((result1, result2) => {
 * 				return asyncOp1(result1, result2);
 * 			})
 * 			.then((result) => {
 * 				return asyncOp2(result);
 * 			})
 * 			.then((result) => {
 * 				finalProcessing(result);
 * 			})
 * 			.finish();
 * ```
 *
 * Note that the finish() call is a TracedKew-specific method that is needed
 * to signal the end of the chained calls (there's no way to infer the end of
 * the chain implicitly).
 *
 */
class SpanChain {
    constructor(span) {
        this.span = span;
    }
}

/**
 * TracedKew mirrors the kew API while also providing a superset of functionality
 * to enable traced promises.
 */
export default class TracedKew {

    //------------------------------------------------------------------------//
    // Constructor
    //------------------------------------------------------------------------//

    constructor(opts) {
        opts = opts || {};

        this.promise = this;  // For kew compatibility

        this._promise = opts.promise;
        this._chain = opts.chain;

        if (!this._promise) {
            throw new Error('Invalid promise');
        }
    }

    //------------------------------------------------------------------------//
    // Static functions
    //------------------------------------------------------------------------//

    static all(promises) {
        return new TracedKew({ promise : Q.all(promises) });
    }

    static tracedAll(span, promises) {
        // Create a span to encapsulate the promises passed to all()
        //const span = Tracer.startSpan(name);
        const spanImp = span.imp();
        const joinValue = _randomGUID();
        const joinKey = _joinKey();
        span.setTag(joinKey, joinValue);

        // Loop through the children and retroactively link them to  span for
        // the "all" operation. Also back date the parent to the oldest child.
        // This is LightStep-specific.
        const children = promises;
        let beginMicros = span.imp().beginMicros();
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (!(child instanceof TracedKew)) {
                continue;
            }
            const childSpan = child.span();
            if (!childSpan) {
                continue;
            }
            childSpan.setTag(joinKey, joinValue);

            const childBeginMicros = childSpan.imp().beginMicros();
            beginMicros = Math.min(childBeginMicros, beginMicros);
        }
        spanImp.setBeginMicros(beginMicros);

        return new TracedKew({
            chain   : new SpanChain(span),
            promise : Q.all(promises),
        });
    }

    static bindPromise(f, scope, ...boundArgs) {
        return function() {
            let defer = TracedKew.defer();
            let thisArgs = Array.prototype.slice.call(arguments);
            try {
                f.apply(scope, boundArgs.concat(thisArgs, [ defer.makeNodeResolver()]));
            } catch (e) {
                defer.reject(e);
            }
            return defer;
        }
    }

    static defer(...args) {
        return new TracedKew({ promise : Q.defer(...args) });
    }

    static tracedDefer(name, parent) {
        const span = Tracer.startSpan(`${name}`, { childOf : parent });
        return new TracedKew({
            chain   : new SpanChain(span),
            promise : Q.defer(),
        });
    }

    static delay(...args) {
        return new TracedKew({ promise : Q.delay(...args) });
    }

    static tracedDelay(name, parent, ms) {
        const span = Tracer.startSpan(`${name}`, { childOf : parent });
        return new TracedKew({
            chain   : new SpanChain(span),
            promise : Q.delay(ms),
        });
    }

    static fcall() {
        throw new Error('NOT_YET_IMPLEMENTED');
    }

    static isPromise() {
        throw new Error('NOT_YET_IMPLEMENTED');
    }

    static isPromiseLike() {
        throw new Error('NOT_YET_IMPLEMENTED');
    }

    static ncall() {
        throw new Error('NOT_YET_IMPLEMENTED');
    }

    static nfcall() {
        throw new Error('NOT_YET_IMPLEMENTED');
    }

    static reject(err) {
        return new TracedKew({ promise : Q.reject(err) });
    }

    static resolve(value) {
        return new TracedKew({ promise : Q.resolve(value) });
    }

    static spread(promises, f) {
        return TracedKew.resolve(promises).spread(f);
    }

    static stats() {
        return this._promise.stats();
    }

    static allSettled(promises) {
        return new TracedKew({
            promise : Q.allSettled(promises),
        });
    }

    static getNextTickFunction(...args) {
        return Q.getNextTickFunction(...args);
    }

    static setNextTickFunction() {
        return Q.setNextTickFunction(...args);
    }

    //------------------------------------------------------------------------//
    // Instance methods
    //------------------------------------------------------------------------//

    fail(...args) {
        args[0] = this._linkSpan('fail', false, true, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.fail(...args),
        });
    }

    tracedFail(...args) {
        args[0] = this._linkSpan('fail', true, true, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.fail(...args),
        });
    }

    fin(...args) {
        args[0] = this._linkSpan('fin', false, true, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.fin(...args),
        });
    }

    tracedFin(...args) {
        args[0] = this._linkSpan('fin', false, true, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.fin(...args),
        });
    }

    makeNodeResolver() {
        return (err, data) => {
            if (err) {
                this.reject(err);
            } else {
                this.resolve(data);
            }
        }
    }

    spread(...args) {
        args[0] = this._linkSpan('spread', false, false, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.spread(...args),
        });
    }

    tracedSpread(...args) {
        args[0] = this._linkSpan('spread', true, false, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.spread(...args),
        });
    }

    resolve(...args) {
        if (this._chain) {
            this._chain.span.finish();
        }
        return this._promise.resolve(...args);
    }

    reject(...args) {
        if (this._chain) {
            this._setSpanError(this._chain.span, arguments);
            this._chain.span.finish();
        }
        return this._promise.reject(...args);
    }

    then(...args) {
        args[0] = this._linkSpan('then', false, false, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.then(...args),
        });
    }

    tracedThen(...args) {
        args[0] = this._linkSpan('traceThen', true, false, args[0]);
        return new TracedKew({
            chain   : this._chain,
            promise : this._promise.then(...args),
        });
    }

    //------------------------------------------------------------------------//
    // Instance methods (TracedKew)
    //------------------------------------------------------------------------//

    finish(cb) {
        this._promise.fin(() => {
            let span = this.span();
            if (span) {
                span.finish();
            }
            if (cb) {
                cb(span);
            }
        });

        // The "chain" was ended by the finish call, don't set it.
        return new TracedKew({
            promise : this._promise,
        });
    }

    /**
     * Allows the span associated with the promise to be named after the
     * promise has started. This will be a safe no-op for promises that do not
     * have an associated span.
     *
     * @param  {string} name
     * @return {[type]}      [description]
     */
    name(name) {
        let span = this.span();
        if (span) {
            span.setOperationName(name);
        }
        return this;
    }

    /**
     * Returns the span associated with the promise, or null if there is no
     * span.
     *
     * @return {Span}
     */
    span() {
        return this._chain ? this._chain.span : null;
    }

    //------------------------------------------------------------------------//
    // Protected methods
    //------------------------------------------------------------------------//

    /**
     * Creates a new "link" in the conceptual chain of Promises. For example,
     * the *invocation* of each callback in the chained functions would
     * result in a new span being linked: each invocation gets its own span
     * with the next invocation following from the prior.
     *
     * Q.all([ promise1, promise2 ])
     *    .then(() => { doSomething(); })
     *    .then(() => { doSomethingElse(); })
     *
     */
    _linkSpan(name, traced, errFlag, f) {
        // The callback's "this" needs to be retained, but the TracedKew "this"
        // object also needs to be referened.
        const self = this;

        return function () {
            // To allow incremental addition of traced promises to promise based
            // code, account for both cases of there being a preceding span or
            // not.
            let nextSpan;
            if (self._chain) {
                const currentSpan = self.span();
                const nextName = `${currentSpan.imp().getOperationName()}.${name}`;
                // TODO: should technically be followsFrom, not childOf
                nextSpan = Tracer.startSpan(nextName, { childOf : currentSpan });
                _joinSpans(currentSpan, nextSpan);
                if (errFlag) {
                    self._setSpanError(currentSpan, arguments);
                }
                currentSpan.finish();
                self._chain.span = nextSpan;
            } else {
                nextSpan = Tracer.startSpan(name);
                self._chain = new SpanChain(nextSpan);
            }

            // Invoke the callback
            let args = arguments;
            if (traced) {
                args = [ nextSpan ].concat(Array.prototype.slice.call(arguments));
            }
            // The "this" here is intentionally not "self"
            return f.apply(this, args);
        };
    }

    _setSpanError(span, args) {
        span.setTag('error', 'true');

        if (!args || args.length === 0) {
            return;
        }

        // Normalize in case it is an Arguments object
        args = Array.prototype.slice.call(args);

        let details = new Array(args.length);
        let message = '';
        for (let i = 0; i < args.length; i++) {
            if (args[i] instanceof Error) {
                details[i] = {
                    type : 'Error',
                };
                if (args[i].message) {
                    details[i].message = args[i].message;
                }
                if (args[i].fileName) {
                    details[i].fileName = args[i].fileName;
                }
                if (args[i].stack) {
                    details[i].stack = args[i].stack.split('\n');
                }
                if (i === 0) {
                    message = args[i].message || 'Error object';
                }
            } else {
                details[i] = args[i];
                if (i === 0) {
                    message = `${args[i]}`;
                }
            }
        }
        span.logEvent(`error: ${message}`, { details : details });
    }
}
