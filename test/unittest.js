const expect = require('chai').expect;
const opentracing = require('opentracing');
const MockTracer = require('../lib/test/lightstep_mock_tracer.js').LightStepMockTracer;
const Q = require('..').default;
const kew = require('kew');

require('source-map-support').install();

opentracing.initGlobalTracer(new MockTracer({}));

function promiseTimeout(ms, fail) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (fail) {
                reject(ms);
            } else {
                resolve(ms);
            }
        }, ms);
    });
}

function kewTimeout(ms, fail) {
    let defer = kew.defer();
    setTimeout(() => {
        if (fail) {
            defer.reject(ms);
        } else {
            defer.resolve(ms);
        }
    }, ms);
    return defer.promise;
}

function untracedTimeout(ms, fail) {
    let defer = Q.defer();
    setTimeout(() => {
        if (fail) {
            defer.reject(ms);
        } else {
            defer.resolve(ms);
        }
    }, ms);
    return defer.promise;
}

function tracedTimeout(ms, span, fail) {
    let defer = Q.tracedDefer('test', span);
    setTimeout(() => {
        if (fail) {
            defer.reject(ms);
        } else {
            defer.resolve(ms);
        }
    }, ms);
    return defer.promise;
}

describe('Standard kew API', function() {

    describe('All kew functions exist', function() {
        const funcNames = [
            'all',
            'bindPromise',
            'defer',
            'delay',
            'fcall',
            'isPromise',
            'isPromiseLike',
            'ncall',
            'nfcall',
            'resolve',
            'reject',
            'spread',
            'stats',
            'allSettled',
            'getNextTickFunction',
            'setNextTickFunction',
        ];
        for (let i = 0; i < funcNames.length; i++) {
            let name = funcNames[i];
            it(`${name} is a function`, function() {
                expect(Q[name]).to.be.a('function');
            });
        }
    });

    describe('Q#all', function() {
        it('should call then if resolved', function(done) {
            Q.all([ untracedTimeout(1) ])
                .then(() => done())
                .fail(() => done(new Error('Unexpected code branch')));
        });
        it('should call fail if rejected', function(done) {
            Q.all([ untracedTimeout(1, true) ])
                .then(() => done(new Error('Unexpected code branch')))
                .fail(() => done());
        });

        it('should call then if resolved (kew)', function(done) {
            Q.all([ kewTimeout(1) ])
                .then(() => done())
                .fail(() => done(new Error('Unexpected code branch')));
        });
        it('should call fail if rejected (kew)', function(done) {
            Q.all([ kewTimeout(1, true) ])
                .then(() => done(new Error('Unexpected code branch')))
                .fail(() => done());
        });
    });

    describe("Q@allSettled", function() {
        it('should add state for each promise', function(done) {
            Q.allSettled([
                untracedTimeout(1),
                500,
                promiseTimeout(10),
                kewTimeout(4),
                promiseTimeout(1, true),
            ]).then((results) => {
                expect(results.length).to.eq(5);
                expect(results[0].state).to.eq('fulfilled');
                expect(results[1].state).to.eq('fulfilled');
                expect(results[2].state).to.eq('fulfilled');
                expect(results[3].state).to.eq('fulfilled');
                expect(results[4].state).to.eq('rejected');
                done();
            }).fail((err)=> {
                done(new Error(err));
            })
        });
    });

    describe("Q#bindPromise", function() {
        it('should bind properly', function(done) {
            let adder = function (a, b, callback) {
                callback(null, a + b)
            };
            let boundAdder = Q.bindPromise(adder, null, 2)
            boundAdder(3)
                .then((val) => {
                    expect(val).to.eq(5);
                    done();
                })
                .fail((err) => {
                    done(new Error(`Unexpected failure ${err}`));
                });
          });
    });

    describe('Q#delay', function() {
        it('should delay before resolving', function(done) {
            const start = Date.now();
            Q.delay(10)
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.gt(9);
                    done();
                })
                .fail((err) => done(new Error(err)));
        });
    });

    describe('Q#fin', function() {
        it('should be called on resolve', function(done) {
            untracedTimeout(1).fin(() => done());
        });
        it('should be called on reject', function(done) {
            untracedTimeout(1, true).fin(() => done());
        });
    });

    describe('Q#reject', function() {
        it('should call then after being resolved', function(done) {
            Q.reject(4)
                .then(() => done(new Error('Unexpected code branch')))
                .fail(() => done());
        });
    });

    describe('Q#resolve', function() {
        it('should call then after being resolved', function(done) {
            Q.resolve(4)
                .then(() => done())
                .fail(() => done(new Error('Unexpected code branch')));
        });
    });

    describe('Q#spread', function() {
        it('should pass results correctly to spread (static)', function(done) {
            Q.spread([
                    Q.resolve(3),
                    untracedTimeout(2),
                    untracedTimeout(1)
                ], (three, two, one) => {
                    expect(three).to.eq(3);
                    expect(two).to.eq(2);
                    expect(one).to.eq(1);
                })
                .then(() => done())
                .fail((err) => done(new Error(err)));
        });
        it('should pass results correctly to spread (method)', function(done) {
            Q.all([
                    Q.resolve(3),
                    untracedTimeout(2),
                    untracedTimeout(1) ])
                .spread((three, two, one) => {
                    expect(three).to.eq(3);
                    expect(two).to.eq(2);
                    expect(one).to.eq(1);
                    done();
                })
                .fail(() => done(new Error('Unexpected code branch')));
        });
        it('should work with all types of promises', function(done) {
            Q.spread([
                    kew.resolve(1),
                    Q.resolve(2),
                    kewTimeout(3),
                    kewTimeout(4),
                    promiseTimeout(5),
                    promiseTimeout(6),
                    untracedTimeout(7),
                    untracedTimeout(8)
                ], (one, two, three, four, five, six, seven, eight) => {
                    expect(eight).to.eq(8);
                    expect(seven).to.eq(7);
                    expect(six).to.eq(6);
                    expect(five).to.eq(5);
                    expect(four).to.eq(4);
                    expect(three).to.eq(3);
                    expect(two).to.eq(2);
                    expect(one).to.eq(1);
                })
                .then(() => done())
                .fail((err) => done(new Error(err)));
        });
    });

    describe('Q#then', function() {
        it('should call every then callback in a chain', function(done) {
            let s = '';
            Q.all([ promiseTimeout(1)])
                .then(() => (s += 'a'))
                .then(() => (s += 'b'))
                .then(() => (s += 'c'))
                .then(() => (s += 'd'))
                .then(() => {
                    expect(s).to.eq('abcd');
                    done();
                });
        });

        it('should handle nested promises', function(done) {
            let s = '';
            Q.all([ promiseTimeout(1)])
                .then(() => (s += 'a'))
                .then(() => (s += 'b'))
                .then(() => {
                    s += 'c';
                    return Q.all([ promiseTimeout(5), Q.resolve(3) ]);
                })
                .then(() => (s += 'd'))
                .then(() => {
                    expect(s).to.eq('abcd');
                    done();
                });
        });

        it('should handle nested kew promises', function(done) {
            let s = '';
            Q.all([ promiseTimeout(1)])
                .then(() => (s += 'a'))
                .then(() => (s += 'b'))
                .then(() => {
                    s += 'c';
                    return kew.all([ kewTimeout(5), kew.resolve(3) ]);
                })
                .then(() => (s += 'd'))
                .then(() => {
                    expect(s).to.eq('abcd');
                    done();
                });
        });
    });

});

describe('Traced API', function() {
    afterEach(function() {
        opentracing.flush();
    });
    describe('Q#tracedAll', function() {

        it('should call then with no promises', function(done) {
            let span = opentracing.startSpan('test');
            Q.tracedAll(span, [])
                .then(() => done())
                .finish();
        });

        it('should call then on resolved TracedPromises', function(done) {
            let span = opentracing.startSpan('test');
            Q.tracedAll(span, [ tracedTimeout(5, span), tracedTimeout(10, span) ])
                .then(() => done())
                .finish();
        });

        it('should call then after last resolved TracedPromises', function(done) {
            let span = opentracing.startSpan('test');
            let start = Date.now();
            Q.tracedAll(span, [ tracedTimeout(5, span), tracedTimeout(50, span) ])
                .then(() => {
                    let delta = Date.now() - start;
                    expect(delta).to.be.gt(30);
                    done();
                })
                .finish();
        });

        it('should call fail on rejected TracedPromises',  function(done) {
            let span = opentracing.startSpan('test');
            let start = Date.now();
            Q.tracedAll(span, [ tracedTimeout(5, span, true), tracedTimeout(50, span) ])
                .then(() => {
                    expect(false).to.be.true;
                    done();
                })
                .fail(() => {
                    let delta = Date.now() - start;
                    expect(delta).to.be.lt(50);
                    done();
                })
                .finish();
        });

        it('should call then on resolved ES6 promises', function(done) {
            let span = opentracing.startSpan('test');
            Q.tracedAll(span, [ Promise.resolve(1), Promise.resolve(2) ])
                .then(() => done())
                .finish();
        });

        it('should call fail on rejected ES6 promises', function(done) {
            let span = opentracing.startSpan('test');
            let start = Date.now();
            Q.tracedAll(span, [ promiseTimeout(5, true), promiseTimeout(50) ])
                .then(() => {
                    done(new Error('Unexpected code branch'));
                })
                .fail(() => {
                    let delta = Date.now() - start;
                    expect(delta).to.be.lt(50);
                    done();
                })
                .finish();
        });
    });

    describe('Q#tracedDelay', function() {
        it('should create a delayed promise', function(done) {
            const start = Date.now();
            Q.tracedDelay('delay', null, 5)
                .tracedThen((span) => {
                    expect(Date.now() - start).to.be.gt(5);
                    done();
                })
                .fail((err) => {
                    done(new Error(err));
                })
                .finish();
        });
        it('should work in conjunction with tracedAll', function (done) {
            // Start a span to track the chained promises
            let span = opentracing.startSpan('Q.all');
            Q.tracedAll(span, [
                Q.tracedDelay('a delay of 5ms', span, 5),
                Q.tracedDelay('a delay of 2ms', span, 2),
            ]).tracedThen((span) => {
                span.logEvent('The promises have resolved!');
                done();
            }).fail((err) => {
                done(new Error(err));
            })
            .finish();
        });
    });

    describe('Q#tracedFail', function() {
        it('should call every then callback in a chain', function(done) {
            Q.all([ promiseTimeout(1, true)])
                .tracedThen((span) => {
                    done(new Error('Unexpected code branch'));
                })
                .tracedThen((span) => {
                    done(new Error('Unexpected code branch'));
                })
                .tracedFail((err) => {
                    done();
                })
                .finish();
        });
    });

    describe('Q#tracedSpread', function() {
        it('should provide a valid span and the expected results', function() {
            Q.all([
                    Q.delay(1),
                    Q.delay(5),
                    Q.delay(3),
                    Q.delay(4),
                    Q.delay(2)
                ])
                .tracedSpread((span, r0, r1, r2, r3, r4) => {
                    span.logEvent('valid span', [ r0, r1, r2, r3, r4 ]);
                    expect(r0).to.eq(1);
                    expect(r1).to.eq(5);
                    expect(r2).to.eq(3);
                    expect(r3).to.eq(4);
                    expect(r4).to.eq(2);
                    done();
                })
                .fail((err) => done(new Error(err)))
                .finish();
        });
        it('should provide a valid span and the expected results (kew)', function() {
            Q.all([
                    kew.delay(1),
                    kew.delay(5),
                    kew.delay(3),
                    kew.delay(4),
                    kew.delay(2)
                ])
                .tracedSpread((span, r0, r1, r2, r3, r4) => {
                    span.logEvent('valid span', [ r0, r1, r2, r3, r4 ]);
                    expect(r0).to.eq(1);
                    expect(r1).to.eq(5);
                    expect(r2).to.eq(3);
                    expect(r3).to.eq(4);
                    expect(r4).to.eq(2);
                    done();
                })
                .fail((err) => done(new Error(err)))
                .finish();
        });
    });

    describe('Q#tracedThen', function() {
        it('should call every then callback in a chain', function(done) {
            let s = '';
            Q.all([ promiseTimeout(1)])
                .tracedThen((span) => {
                    s += 'a';
                    span.logEvent('a span', s);
                })
                .tracedThen((span) => {
                    s += 'b';
                    span.logEvent('b span', s);
                })
                .tracedThen((span) => {
                    s += 'c';
                    span.logEvent('c span', s);
                })
                .tracedThen((span) => {
                    s += 'd';
                    span.logEvent('d span', s);
                })
                .tracedThen((span) => {
                    expect(s).to.eq('abcd');
                    done();
                })
                .fail((err) => {
                    done(err);
                })
                .finish();
        });

        it('should call every then callback in a chain (kew)', function(done) {
            Q.all([ kew.delay(1)])
                .tracedThen((span, result) => {
                    result += 'a';
                    span.logEvent('a span', result);
                    return kew.resolve(result);
                })
                .tracedThen((span, result) => {
                    result += 'b';
                    span.logEvent('b span', result);
                    return kew.resolve(result);
                })
                .tracedThen((span, result) => {
                    result += 'c';
                    span.logEvent('c span', result);
                    return kew.resolve(result);
                })
                .tracedThen((span, result) => {
                    result += 'd';
                    span.logEvent('d span', result);
                    return kew.resolve(result);
                })
                .tracedThen((span, result) => {
                    expect(result).to.eq('abcd');
                    done();
                })
                .fail((err) => {
                    done(err);
                })
                .finish();
        });
    });
});
