'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mock_context = require('./mock_context');

var _mock_context2 = _interopRequireDefault(_mock_context);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * OpenTracing Span implementation designed for use in
 * unit tests.
 */
var MockSpan = function () {
    _createClass(MockSpan, [{
        key: 'context',


        //------------------------------------------------------------------------//
        // OpenTracing API
        //------------------------------------------------------------------------//

        value: function context() {
            return new _mock_context2.default(this);
        }
    }, {
        key: 'tracer',
        value: function tracer() {
            return this._tracer;
        }
    }, {
        key: 'setOperationName',
        value: function setOperationName(name) {
            this._operationName = name;
        }
    }, {
        key: 'addTags',
        value: function addTags(set) {
            var keys = Object.keys(set);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                this._tags[key] = set[key];
            }
        }
    }, {
        key: 'log',
        value: function log(fields) {
            this._logs.push(fields);
        }
    }, {
        key: 'finish',
        value: function finish(finishTime) {
            this._finishMs = finishTime || Date.now();
        }

        //------------------------------------------------------------------------//
        // MockSpan-specific
        //------------------------------------------------------------------------//

    }]);

    function MockSpan(tracer) {
        _classCallCheck(this, MockSpan);

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
    }

    _createClass(MockSpan, [{
        key: 'uuid',
        value: function uuid() {
            return this._uuid;
        }
    }, {
        key: '_generateUUID',
        value: function _generateUUID() {
            var p0 = ('00000000' + (Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            var p1 = ('00000000' + (Math.random() * 0xFFFFFFFF | 0).toString(16)).substr(-8);
            return '' + p0 + p1;
        }
    }, {
        key: 'addReference',
        value: function addReference(ref) {
            switch (ref.type()) {
                case opentracing.REFERENCE_CHILD_OF:
                    this._childOf = ref.referencedContext().imp().spanImp();
                    this._childOf._children.push(this);
                    break;
                case opentracing.REFERENCE_FOLLOWS_FROM:
                    this._followsFrom = ref.referencedContext().imp().span();
                    break;
                default:
                    throw new Error('Unknown reference type  ' + ref.type());
            }
        }
    }]);

    return MockSpan;
}();

exports.default = MockSpan;

//# sourceMappingURL=mock_span.js.map