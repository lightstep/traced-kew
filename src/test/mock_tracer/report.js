/* eslint-disable import/no-extraneous-dependencies */

import _ from 'underscore';

export default class Report {

    constructor(spans) {
        this.spans = spans;
        this.spansByUUID = {};
        this.spansByTag = {};
        this.debugSpans = [];

        this.unfinishedSpans = [];
        this.minStartMs = undefined;
        this.maxFinishMs = undefined;

        _.each(spans, (span) => {
            if (span._finishMs === 0) {
                this.unfinishedSpans.push(span);
            }

            if (!(this.minStartMs < span._startMs)) {
                this.minStartMs = span._startMs;
            }
            if (!(this.maxFinishMs > span._finishMs)) {
                this.maxFinishMs = span._finishMs;
            }

            this.spansByUUID[span.uuid()] = span;
            this.debugSpans.push(span.debug());

            _.each(span._tags, (val, key) => {
                this.spansByTag[key] = this.spansByTag[key] || {};
                this.spansByTag[key][val] = this.spansByTag[key][val] || [];
                this.spansByTag[key][val].push(span);
            });
        });
    }

    debugUnfinishedSpans() {
        return _.map(this.unfinishedSpans, (span) => {
            let obj = span.debug();
            obj.stack = span._startStack.split('\n').slice(2);
            return obj;
        });
    }

    firstSpanWithTagValue(key, val) {
        let m = this.spansByTag[key];
        if (!m) {
            return null;
        }
        let n = m[val];
        if (!n) {
            return null;
        }
        return n[0];
    }
}
