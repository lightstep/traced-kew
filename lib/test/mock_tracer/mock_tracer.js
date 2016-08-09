'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mock_span = require('./mock_span');

var _mock_span2 = _interopRequireDefault(_mock_span);

var _report = require('./report');

var _report2 = _interopRequireDefault(_report);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
            this._spans.push(span);

            if (fields.references) {
                for (var i = 0; i < fields.references; i++) {
                    span.addReference(fields.references[i]);
                }
            }

            // Capture the stack at the time the span started
            span._startStack = new Error().stack;

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
            this.clear();
            if (callback) {
                callback(null);
            }
        }

        //------------------------------------------------------------------------//
        // MockTracer-specific
        //------------------------------------------------------------------------//

    }]);

    function MockTracer() {
        _classCallCheck(this, MockTracer);

        this._tracerInterface = null;
        this._spans = [];
    }

    _createClass(MockTracer, [{
        key: '_allocSpan',
        value: function _allocSpan() {
            return new _mock_span2.default(this);
        }

        /**
         * Discard any buffered data.
         */

    }, {
        key: 'clear',
        value: function clear() {
            this._spans = [];
        }

        /**
         * Return the buffered data in a format convenient for making unit test
         * assertions.
         */

    }, {
        key: 'report',
        value: function report() {
            return new _report2.default(this._spans);
        }
    }]);

    return MockTracer;
}();

exports.default = MockTracer;

//# sourceMappingURL=mock_tracer.js.map