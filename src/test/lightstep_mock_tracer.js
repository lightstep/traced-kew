/* eslint-disable import/no-extraneous-dependencies */

import fs from 'fs';
import _ from 'underscore';
import { MockTracer, MockSpan } from './mock_tracer';


/**
 * Extend the MockSpan to include LightStep-specific API implementations
 */
class LightStepMockSpan extends MockSpan {

    getOperationName() {
        return this._operationName;
    }

    beginMicros() {
        return this._startMs * 1000;
    }
    setBeginMicros(us) {
        this._startMs = us / 1000;
    }

    endMicros() {
        return this.finishMs * 1000;
    }
    setEndMicros(us) {
        this._finishMs = us / 1000;
    }

    generateTraceURL() {
        return 'https://example.com/lightstep/mock_span/';
    }
}

/**
 * Extend the MockTracer to include LightStep-specific API implementations
 */
export default class LightStepMockTracer extends MockTracer {
    _allocSpan(fields) {
        return new LightStepMockSpan(this);
    }

    /**
     * Generates a DOT file (http://www.graphviz.org/) for visualizing the
     * join ID relationships from a MockTracer report.
     */
    generateDotFile(filename, report) {
        report = report || this.report();

        let vertices = [];
        let edges = [];
        let joinSets = {};
        let offsetMs = report.minStartMs;

        _.each(report.spans, (span) => {
            let color = span._finishMs === 0 ? 'red' : 'black';
            let duration = span._finishMs - span._startMs;
            let width = duration;
            if (duration < 0) {
                duration = 'unfinished';
                width = 0;
            } else {
                duration = [
                    `${duration}ms`,
                    `${span._startMs - offsetMs}-${span._finishMs - offsetMs}`,
                ].join('\n');
            }
            let label = `${span._operationName}\n${duration}`;

            _.each(span._tags, (val, key) => {
                if (key.match(/^join:/)) {
                    return;
                }
                label += `\n${key}=${val}`;
            });
            vertices.push(`S${span.uuid()} [label="${label}",color="${color}",shape="box",width="${width}"];`);

            _.each(span._tags, (val, key) => {
                if (!key.match(/^join:/)) {
                    return;
                }
                let setKey = `${key}|${val}`;
                joinSets[setKey] = joinSets[setKey] || {};
                joinSets[setKey][span.uuid()] = true;
            });
        });
        _.each(joinSets, (set, key) => {
            let uuids = _.keys(set);
            for (let i = 0; i < uuids.length; i++) {
                for (let j = i + 1; j < uuids.length; j++) {
                    edges.push(`S${uuids[i]} -- S${uuids[j]};`);
                }
            }
        });

        let preface = [
            'graph {',
        ];
        let suffix = [
            '}',
        ];
        console.log(`Writing DOT graph to '${filename}'`);  // eslint-disable-line
        fs.writeFileSync(filename, preface.concat(vertices, edges, suffix).join('\n'));
    }
}

// Workaround to avoid require('package').default in ES5.
module.exports = module.exports.default;
