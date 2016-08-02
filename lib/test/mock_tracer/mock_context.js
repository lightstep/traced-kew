"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * OpenTracing Context implementation designed for use in
 * unit tests.
 */
var MockContext = function () {
    _createClass(MockContext, [{
        key: "setBaggageItem",

        //------------------------------------------------------------------------//
        // OpenTracing API
        //------------------------------------------------------------------------//

        value: function setBaggageItem(key, value) {
            this._baggage[key] = value;
        }
    }, {
        key: "getBaggageItem",
        value: function getBaggageItem(key) {
            return this._baggage[key];
        }

        //------------------------------------------------------------------------//
        // MockContext-specific
        //------------------------------------------------------------------------//

    }]);

    function MockContext(spanImp) {
        _classCallCheck(this, MockContext);

        // Store a reference to the span itself since this is a mock tracer
        // intended to make debugging and unit testing easier.
        this._spanImp = spanImp;
        this._baggage = {};
    }

    _createClass(MockContext, [{
        key: "spanImp",
        value: function spanImp() {
            return this._spanImp;
        }
    }]);

    return MockContext;
}();

exports.default = MockContext;

//# sourceMappingURL=mock_context.js.map