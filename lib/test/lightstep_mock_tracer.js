'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.LightStepMockTracer = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mock_tracer = require('./mock_tracer');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

console.log(require('./mock_tracer'));

/**
 * Extend the MockSpan to include LightStep-specific API implementations
 */

var LightStepMockSpan = function (_MockSpan) {
    _inherits(LightStepMockSpan, _MockSpan);

    function LightStepMockSpan() {
        _classCallCheck(this, LightStepMockSpan);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(LightStepMockSpan).apply(this, arguments));
    }

    _createClass(LightStepMockSpan, [{
        key: 'getOperationName',
        value: function getOperationName() {
            return this._operationName;
        }
    }, {
        key: 'beginMicros',
        value: function beginMicros() {
            return this._startMs * 1000;
        }
    }, {
        key: 'setBeginMicros',
        value: function setBeginMicros(us) {
            this._startMs = us / 1000;
        }
    }, {
        key: 'endMicros',
        value: function endMicros() {
            return this.finishMs * 1000;
        }
    }, {
        key: 'setEndMicros',
        value: function setEndMicros(us) {
            this._finishMs = us / 1000;
        }
    }, {
        key: 'generateTraceURL',
        value: function generateTraceURL() {
            return 'https://example.com/lightstep/mock_span/';
        }
    }]);

    return LightStepMockSpan;
}(_mock_tracer.MockSpan);

/**
 * Extend the MockTracer to include LightStep-specific API implementations
 */


var LightStepMockTracer = exports.LightStepMockTracer = function (_MockTracer) {
    _inherits(LightStepMockTracer, _MockTracer);

    function LightStepMockTracer() {
        _classCallCheck(this, LightStepMockTracer);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(LightStepMockTracer).apply(this, arguments));
    }

    _createClass(LightStepMockTracer, [{
        key: '_allocSpan',
        value: function _allocSpan(fields) {
            return new LightStepMockSpan(this);
        }
    }]);

    return LightStepMockTracer;
}(_mock_tracer.MockTracer);

//# sourceMappingURL=lightstep_mock_tracer.js.map