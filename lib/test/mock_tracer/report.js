'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable import/no-extraneous-dependencies */

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Report = function () {
    function Report(spans) {
        var _this = this;

        _classCallCheck(this, Report);

        this.spans = spans;
        this.spansByUUID = {};
        this.spansByTag = {};
        this.debugSpans = [];

        this.unfinishedSpans = [];
        this.minStartMs = undefined;
        this.maxFinishMs = undefined;

        _underscore2.default.each(spans, function (span) {
            if (span._finishMs === 0) {
                _this.unfinishedSpans.push(span);
            }

            if (!(_this.minStartMs < span._startMs)) {
                _this.minStartMs = span._startMs;
            }
            if (!(_this.maxFinishMs > span._finishMs)) {
                _this.maxFinishMs = span._finishMs;
            }

            _this.spansByUUID[span.uuid()] = span;
            _this.debugSpans.push(span.debug());

            _underscore2.default.each(span._tags, function (val, key) {
                _this.spansByTag[key] = _this.spansByTag[key] || {};
                _this.spansByTag[key][val] = _this.spansByTag[key][val] || [];
                _this.spansByTag[key][val].push(span);
            });
        });
    }

    _createClass(Report, [{
        key: 'debugUnfinishedSpans',
        value: function debugUnfinishedSpans() {
            return _underscore2.default.map(this.unfinishedSpans, function (span) {
                var obj = span.debug();
                obj.stack = span._startStack.split('\n').slice(2);
                return obj;
            });
        }
    }, {
        key: 'firstSpanWithTagValue',
        value: function firstSpanWithTagValue(key, val) {
            var m = this.spansByTag[key];
            if (!m) {
                return null;
            }
            var n = m[val];
            if (!n) {
                return null;
            }
            return n[0];
        }
    }]);

    return Report;
}();

exports.default = Report;

//# sourceMappingURL=report.js.map