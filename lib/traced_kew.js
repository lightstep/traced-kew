'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _kew = require('kew');

var Q = _interopRequireWildcard(_kew);

var _opentracing = require('opentracing');

var _opentracing2 = _interopRequireDefault(_opentracing);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } /* eslint-disable no-use-before-define */

function _randomGUID() {
    return [('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8), ('00000000' + Math.abs(Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8)].join('');
}

var uniqueLinkID = 0;
function _joinKey() {
    uniqueLinkID++;
    return 'join:linked_trace_' + uniqueLinkID;
}

function _joinSpans(parent, child) {
    if (!parent || !child) {
        return;
    }
    var joinKey = _joinKey();
    var joinValue = _randomGUID();
    parent.setTag(joinKey, joinValue);
    child.setTag(joinKey, joinValue);
}

function _linkChildren(span, promises) {
    var spanImp = span.imp();
    var joinValue = _randomGUID();
    var joinKey = _joinKey();
    span.setTag(joinKey, joinValue);

    // Loop through the children and retroactively link them to  span for
    // the "all" operation. Also back date the parent to the oldest child.
    // This is LightStep-specific.
    var children = promises;
    var beginMicros = span.imp().beginMicros();
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (!(child instanceof TracedKew)) {
            continue;
        }
        var childSpan = child.span();
        if (!childSpan) {
            continue;
        }
        childSpan.setTag(joinKey, joinValue);

        var childBeginMicros = childSpan.imp().beginMicros();
        beginMicros = Math.min(childBeginMicros, beginMicros);
    }
    spanImp.setBeginMicros(beginMicros);
}

function _wrap(prev, result) {
    if (result instanceof Promise) {
        return new TracedKew({
            chain: prev._chain,
            promise: result
        });
    }
    return result;
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

var SpanChain = function SpanChain(span) {
    _classCallCheck(this, SpanChain);

    this.span = span;
};

/**
 * TracedKew mirrors the kew API while also providing a superset of functionality
 * to enable traced promises.
 */


var TracedKew = function () {

    //------------------------------------------------------------------------//
    // Constructor
    //------------------------------------------------------------------------//

    function TracedKew(opts) {
        _classCallCheck(this, TracedKew);

        opts = opts || {};

        this.promise = this; // For kew compatibility

        this._promise = opts.promise;
        this._chain = opts.chain;

        if (!this._promise) {
            throw new Error('Invalid promise');
        }
    }

    //------------------------------------------------------------------------//
    // Static functions
    //------------------------------------------------------------------------//

    _createClass(TracedKew, [{
        key: 'fail',


        //------------------------------------------------------------------------//
        // Instance methods
        //------------------------------------------------------------------------//

        value: function fail() {
            var _promise;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            args[0] = this._linkSpan('fail', false, true, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise = this._promise).fail.apply(_promise, args)
            });
        }
    }, {
        key: 'tracedFail',
        value: function tracedFail() {
            var _promise2;

            for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                args[_key2] = arguments[_key2];
            }

            args[0] = this._linkSpan('fail', true, true, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise2 = this._promise).fail.apply(_promise2, args)
            });
        }
    }, {
        key: 'fin',
        value: function fin() {
            var _promise3;

            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
            }

            args[0] = this._linkSpan('fin', false, true, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise3 = this._promise).fin.apply(_promise3, args)
            });
        }
    }, {
        key: 'tracedFin',
        value: function tracedFin() {
            var _promise4;

            for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                args[_key4] = arguments[_key4];
            }

            args[0] = this._linkSpan('fin', false, true, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise4 = this._promise).fin.apply(_promise4, args)
            });
        }
    }, {
        key: 'makeNodeResolver',
        value: function makeNodeResolver() {
            var _this = this;

            return function (err, data) {
                if (err) {
                    _this.reject(err);
                } else {
                    _this.resolve(data);
                }
            };
        }
    }, {
        key: 'spread',
        value: function spread() {
            var _promise5;

            for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                args[_key5] = arguments[_key5];
            }

            args[0] = this._linkSpan('spread', false, false, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise5 = this._promise).spread.apply(_promise5, args)
            });
        }
    }, {
        key: 'tracedSpread',
        value: function tracedSpread() {
            var _promise6;

            for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
                args[_key6] = arguments[_key6];
            }

            args[0] = this._linkSpan('spread', true, false, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise6 = this._promise).spread.apply(_promise6, args)
            });
        }
    }, {
        key: 'resolve',
        value: function resolve() {
            var _promise7;

            if (this._chain) {
                this._chain.span.finish();
            }
            return (_promise7 = this._promise).resolve.apply(_promise7, arguments);
        }
    }, {
        key: 'reject',
        value: function reject() {
            var _promise8;

            for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
                args[_key7] = arguments[_key7];
            }

            if (this._chain) {
                this._setSpanError(this._chain.span, arguments);
                this._chain.span.finish();
            }
            return (_promise8 = this._promise).reject.apply(_promise8, args);
        }
    }, {
        key: 'then',
        value: function then() {
            var _promise9;

            for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
                args[_key8] = arguments[_key8];
            }

            args[0] = this._linkSpan('then', false, false, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise9 = this._promise).then.apply(_promise9, args)
            });
        }
    }, {
        key: 'tracedThen',
        value: function tracedThen() {
            var _promise10;

            for (var _len9 = arguments.length, args = Array(_len9), _key9 = 0; _key9 < _len9; _key9++) {
                args[_key9] = arguments[_key9];
            }

            // Modify the callback that gets invoked
            args[0] = this._linkSpan('tracedThen', true, false, args[0]);
            return new TracedKew({
                chain: this._chain,
                promise: (_promise10 = this._promise).then.apply(_promise10, args)
            });
        }

        //------------------------------------------------------------------------//
        // Instance methods (TracedKew)
        //------------------------------------------------------------------------//

    }, {
        key: 'finish',
        value: function finish(cb) {
            var _this2 = this;

            this._promise.fin(function () {
                var span = _this2.span();
                if (span) {
                    span.finish();
                }
                if (cb) {
                    cb(span);
                }
            });

            // The "chain" was ended by the finish call, don't set it.
            return new TracedKew({
                promise: this._promise
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

    }, {
        key: 'name',
        value: function name(_name) {
            var span = this.span();
            if (span) {
                span.setOperationName(_name);
            }
            return this;
        }

        /**
         * Returns the span associated with the promise, or null if there is no
         * span.
         *
         * @return {Span}
         */

    }, {
        key: 'span',
        value: function span() {
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

    }, {
        key: '_linkSpan',
        value: function _linkSpan(name, traced, errFlag, f) {
            // The callback's "this" needs to be retained, but the TracedKew "this"
            // object also needs to be referened.
            var self = this;

            return function () {
                // To allow incremental addition of traced promises to promise based
                // code, account for both cases of there being a preceding span or
                // not.
                var nextSpan = void 0;
                if (self._chain) {
                    var currentSpan = self.span();
                    var nextName = currentSpan.imp().getOperationName() + '.' + name;
                    // TODO: should technically be followsFrom, not childOf
                    nextSpan = _opentracing2.default.startSpan(nextName, { childOf: currentSpan });
                    _joinSpans(currentSpan, nextSpan);
                    if (errFlag) {
                        self._setSpanError(currentSpan, arguments);
                    }
                    currentSpan.finish();
                    self._chain.span = nextSpan;
                } else {
                    nextSpan = _opentracing2.default.startSpan(name);
                    self._chain = new SpanChain(nextSpan);
                }

                // Invoke the callback
                var args = arguments;
                if (traced) {
                    args = [nextSpan].concat(Array.prototype.slice.call(arguments));
                }

                // NOTE: the "this" and "self" are different objects
                return _wrap(self, f.apply(this, args));
            };
        }
    }, {
        key: '_setSpanError',
        value: function _setSpanError(span, args) {
            span.setTag('error', 'true');

            if (!args || args.length === 0) {
                return;
            }

            // Normalize in case it is an Arguments object
            args = Array.prototype.slice.call(args);

            var details = new Array(args.length);
            var message = '';
            for (var i = 0; i < args.length; i++) {
                if (args[i] instanceof Error) {
                    details[i] = {
                        type: 'Error'
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
                        message = '' + args[i];
                    }
                }
            }
            span.logEvent('error: ' + message, { details: details });
        }
    }], [{
        key: 'all',
        value: function all(promises) {
            var span = _opentracing2.default.startSpan('all');
            var p = Q.all(promises);
            p.fin(function () {
                _linkChildren(span, promises);
                span.finish();
            });
            return new TracedKew({
                chain: new SpanChain(span),
                promise: p
            });
        }
    }, {
        key: 'tracedAll',
        value: function tracedAll(span, promises) {
            _linkChildren(span, promises);
            return new TracedKew({
                chain: new SpanChain(span),
                promise: Q.all(promises)
            });
        }
    }, {
        key: 'bindPromise',
        value: function bindPromise(f, scope) {
            for (var _len10 = arguments.length, boundArgs = Array(_len10 > 2 ? _len10 - 2 : 0), _key10 = 2; _key10 < _len10; _key10++) {
                boundArgs[_key10 - 2] = arguments[_key10];
            }

            return function () {
                var defer = TracedKew.defer();
                var thisArgs = Array.prototype.slice.call(arguments);
                try {
                    f.apply(scope, boundArgs.concat(thisArgs, [defer.makeNodeResolver()]));
                } catch (e) {
                    defer.reject(e);
                }
                return defer;
            };
        }
    }, {
        key: 'defer',
        value: function defer() {
            return new TracedKew({ promise: Q.defer.apply(Q, arguments) });
        }
    }, {
        key: 'tracedDefer',
        value: function tracedDefer(name, parent) {
            var span = _opentracing2.default.startSpan('' + name, { childOf: parent });
            return new TracedKew({
                chain: new SpanChain(span),
                promise: Q.defer()
            });
        }
    }, {
        key: 'delay',
        value: function delay(ms) {
            var span = _opentracing2.default.startSpan('delay');
            return new TracedKew({
                chain: new SpanChain(span),
                promise: Q.delay(ms)
            });
        }
    }, {
        key: 'tracedDelay',
        value: function tracedDelay(name, parent, ms) {
            var span = _opentracing2.default.startSpan('' + name, { childOf: parent });
            return new TracedKew({
                chain: new SpanChain(span),
                promise: Q.delay(ms)
            });
        }
    }, {
        key: 'fcall',
        value: function fcall() {
            throw new Error('NOT_YET_IMPLEMENTED');
        }
    }, {
        key: 'isPromise',
        value: function isPromise() {
            throw new Error('NOT_YET_IMPLEMENTED');
        }
    }, {
        key: 'isPromiseLike',
        value: function isPromiseLike() {
            throw new Error('NOT_YET_IMPLEMENTED');
        }
    }, {
        key: 'ncall',
        value: function ncall() {
            throw new Error('NOT_YET_IMPLEMENTED');
        }
    }, {
        key: 'nfcall',
        value: function nfcall() {
            throw new Error('NOT_YET_IMPLEMENTED');
        }
    }, {
        key: 'reject',
        value: function reject(err) {
            return new TracedKew({ promise: Q.reject(err) });
        }
    }, {
        key: 'resolve',
        value: function resolve(value) {
            return new TracedKew({ promise: Q.resolve(value) });
        }
    }, {
        key: 'spread',
        value: function spread(promises, f) {
            return TracedKew.resolve(promises).spread(f);
        }
    }, {
        key: 'stats',
        value: function stats() {
            return this._promise.stats();
        }
    }, {
        key: 'allSettled',
        value: function allSettled(promises) {
            return new TracedKew({
                promise: Q.allSettled(promises)
            });
        }
    }, {
        key: 'getNextTickFunction',
        value: function getNextTickFunction() {
            return Q.getNextTickFunction.apply(Q, arguments);
        }
    }, {
        key: 'setNextTickFunction',
        value: function setNextTickFunction() {
            return Q.setNextTickFunction.apply(Q, arguments);
        }
    }]);

    return TracedKew;
}();

exports.default = TracedKew;

//# sourceMappingURL=traced_kew.js.map