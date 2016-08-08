'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mock_span = require('./mock_span');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * OpenTracing Tracer implementation designed for use in
 * unit tests.
 */
var MockTracer = function () {
    _createClass(MockTracer, [{
        key: 'setInterface',


        //------------------------------------------------------------------------//
        // OpenTracing API
        //------------------------------------------------------------------------//

        value: function setInterface(tracer) {
            this._tracerInterface = tracer;
        }
    }, {
        key: 'startSpan',
        value: function startSpan(fields) {
            // _allocSpan is given it's own method so that derived classes can
            // allocate any type of object they want, but not have to duplicate
            // the other common logic in startSpan().
            var span = this._allocSpan(fields);

            span.setOperationName(fields.operationName);
            this._spansByUUID[span.uuid()] = span;

            if (fields.references) {
                for (var i = 0; i < fields.references; i++) {
                    span.addReference(fields.references[i]);
                }
            }

            return span;
        }
    }, {
        key: 'inject',
        value: function inject(span, format, carrier) {
            throw new Error('NOT YET IMPLEMENTED');
        }
    }, {
        key: 'extract',
        value: function extract(format, carrier) {
            throw new Error('NOT YET IMPLEMENTED');
        }
    }, {
        key: 'flush',
        value: function flush(callback) {
            var keys = Object.keys(this._spansByUUID);
            var spans = new Array(keys.length);
            for (var i = 0; i < keys.length; i++) {
                spans[i] = this._spansByUUID[keys[i]];
            }
            this._spansByUUID = {};

            // The _flushCb is a MockTracer specific hook to get the collected
            // data. The callback passed into the function is the OpenTracing API
            // callback which simply signifies when the flush has completed (and
            // whether there was an error or not).
            this._flushCb(spans);

            if (callback) {
                callback(null);
            }
        }

        //------------------------------------------------------------------------//
        // MockTracer-specific
        //------------------------------------------------------------------------//

    }]);

    function MockTracer(_ref) {
        var flush = _ref.flush;

        _classCallCheck(this, MockTracer);

        this._tracerInterface = null;

        this._spansByUUID = {};
        this._flushCb = flush || function () {};
    }

    _createClass(MockTracer, [{
        key: '_allocSpan',
        value: function _allocSpan() {
            return new _mock_span.MockSpan(this);
        }
    }]);

    return MockTracer;
}();

exports.default = MockTracer;

//# sourceMappingURL=mock_tracer.js.map