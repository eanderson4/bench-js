"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var RxJSBatchProcessor = /** @class */ (function () {
    function RxJSBatchProcessor(name, bufferTimeMs, processItems) {
        this.name = name;
        this.processItems = processItems;
        this.bufferTimeMs = bufferTimeMs;
    }
    RxJSBatchProcessor.prototype.addItem = function (item) {
        this.subject.next(item);
    };
    RxJSBatchProcessor.prototype.start = function () {
        var _this = this;
        this.batchesComplete = 0;
        this.itemsComplete = 0;
        this.subject = new rxjs_1.Subject();
        this.subscription = this.subject.
            pipe((0, operators_1.bufferTime)(this.bufferTimeMs))
            .subscribe(function (items) {
            _this.batchesComplete++;
            _this.itemsComplete += items.length;
            if (items.length > 0) {
                _this.processItems(items);
                _this.lastProcTime = performance.now();
            }
        });
    };
    RxJSBatchProcessor.prototype.stop = function () {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    };
    RxJSBatchProcessor.prototype.getAvgBatchSize = function () {
        return this.itemsComplete / this.batchesComplete;
    };
    return RxJSBatchProcessor;
}());
var TimerBatchProcessor = /** @class */ (function () {
    function TimerBatchProcessor(name, bufferTimeMs, processItems) {
        this.name = name;
        this.processItems = processItems;
        this.buffer = [];
        this.intervalId = null;
        this.bufferTimeMs = bufferTimeMs;
    }
    TimerBatchProcessor.prototype.addItem = function (item) {
        this.buffer.push(item);
    };
    TimerBatchProcessor.prototype.start = function () {
        var _this = this;
        this.batchesComplete = 0;
        this.itemsComplete = 0;
        this.intervalId = setInterval(function () {
            _this.batchesComplete++;
            _this.itemsComplete += _this.buffer.length;
            if (_this.buffer.length > 0) {
                _this.processItems(__spreadArray([], _this.buffer, true));
                _this.lastProcTime = performance.now();
                _this.buffer = [];
            }
        }, this.bufferTimeMs);
    };
    TimerBatchProcessor.prototype.stop = function () {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    };
    TimerBatchProcessor.prototype.getAvgBatchSize = function () {
        return this.itemsComplete / this.batchesComplete;
    };
    return TimerBatchProcessor;
}());
var BufferBenchmark = /** @class */ (function () {
    function BufferBenchmark() {
        this.results = [];
    }
    BufferBenchmark.prototype.calculateStats = function (runs) {
        var avgTime = runs.reduce(function (sum, r) { return sum + r.processingTime; }, 0) / runs.length;
        var avgCpu = runs.reduce(function (sum, r) { return sum + r.cpuPercent; }, 0) / runs.length;
        // Calculate standard deviations
        var stdDevTime = Math.sqrt(runs.reduce(function (sum, r) { return sum + Math.pow(r.processingTime - avgTime, 2); }, 0) / runs.length);
        var stdDevCpu = Math.sqrt(runs.reduce(function (sum, r) { return sum + Math.pow(r.cpuPercent - avgCpu, 2); }, 0) / runs.length);
        // Use the last run for other metrics, as they should be consistent
        var lastRun = runs[runs.length - 1];
        return __assign(__assign({}, lastRun), { avgTime: avgTime, stdDevTime: stdDevTime, avgCpu: avgCpu, stdDevCpu: stdDevCpu });
    };
    BufferBenchmark.prototype.runBenchmark = function () {
        return __awaiter(this, void 0, void 0, function () {
            var processItems, processItemsWithSum, rxProcessor, timerProcessor, rxSumProcessor, timerSumProcessor, rxQuickSumProcessor, timerQuickSumProcessor, emissionRates, processors, iterations, _i, emissionRates_1, rate, _a, processors_1, proc, runs, i, result, statResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        processItems = function (items) {
                            return;
                        };
                        processItemsWithSum = function (items) {
                            var sum = 0;
                            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                                var item = items_1[_i];
                                sum += item * item;
                            }
                            return sum;
                        };
                        rxProcessor = new RxJSBatchProcessor('rxjs', 250, processItems);
                        timerProcessor = new TimerBatchProcessor('interval', 250, processItems);
                        rxSumProcessor = new RxJSBatchProcessor('rxjs-sum', 250, processItemsWithSum);
                        timerSumProcessor = new TimerBatchProcessor('interval-sum', 250, processItemsWithSum);
                        rxQuickSumProcessor = new RxJSBatchProcessor('rxjs-quick-sum', 150, processItemsWithSum);
                        timerQuickSumProcessor = new TimerBatchProcessor('interval-quick-sum', 150, processItemsWithSum);
                        emissionRates = [1, 10, 100, 1e3, 1e4, 1e5, 5e5, 1e6, 5e6, 1e7];
                        processors = [
                            rxProcessor,
                            timerProcessor,
                            rxSumProcessor,
                            timerSumProcessor,
                            rxQuickSumProcessor,
                            timerQuickSumProcessor
                        ];
                        iterations = 5;
                        _i = 0, emissionRates_1 = emissionRates;
                        _b.label = 1;
                    case 1:
                        if (!(_i < emissionRates_1.length)) return [3 /*break*/, 10];
                        rate = emissionRates_1[_i];
                        _a = 0, processors_1 = processors;
                        _b.label = 2;
                    case 2:
                        if (!(_a < processors_1.length)) return [3 /*break*/, 9];
                        proc = processors_1[_a];
                        console.log("Benchmark for ".concat(proc.name, "->").concat(rate));
                        runs = [];
                        i = 0;
                        _b.label = 3;
                    case 3:
                        if (!(i < iterations)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.benchmarkRate(rate, proc)];
                    case 4:
                        result = _b.sent();
                        runs.push(result);
                        // Optional: Add delay between runs
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 5:
                        // Optional: Add delay between runs
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 3];
                    case 7:
                        statResult = this.calculateStats(runs);
                        this.results.push(statResult);
                        _b.label = 8;
                    case 8:
                        _a++;
                        return [3 /*break*/, 2];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10:
                        this.printResults(this.results, iterations);
                        return [2 /*return*/];
                }
            });
        });
    };
    BufferBenchmark.prototype.benchmarkRate = function (eventsPerSecond, proc) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var samples = eventsPerSecond * 3; // Total events to test
                        var bufferDelay = 1000; // Wait 1s after last event to ensure processing
                        var start = performance.now();
                        var startCpu = process.cpuUsage();
                        var emitted = 0;
                        proc.start();
                        // For low rates, we need to ensure proper timing between events
                        var interval = 1000 / eventsPerSecond;
                        var minInterval = 50; // Minimum interval in ms
                        var emitNext = function () {
                            if (emitted < samples) {
                                proc.addItem(emitted++);
                                // For high rates, emit multiple events per cycle
                                if (interval < minInterval) {
                                    var batchSize = Math.min(Math.floor(minInterval / interval), samples - emitted);
                                    for (var i = 0; i < batchSize; i++) {
                                        proc.addItem(emitted++);
                                    }
                                }
                                if (emitted < samples) {
                                    setTimeout(emitNext, Math.max(interval, minInterval));
                                }
                                else {
                                    finishBenchmark();
                                }
                            }
                        };
                        var finishBenchmark = function () {
                            setTimeout(function () {
                                var now = proc.lastProcTime;
                                var cpuUsage = process.cpuUsage(startCpu);
                                var processingTime = now - start;
                                // Convert from microseconds to milliseconds and calculate percentage
                                var totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
                                var cpuPercent = (totalCpuMs / processingTime) * 100;
                                proc.stop();
                                resolve({
                                    name: proc.name,
                                    bufferTimeMs: proc.bufferTimeMs,
                                    samples: samples,
                                    processingTime: processingTime,
                                    avgBatchSize: proc.getAvgBatchSize(),
                                    itemsComplete: proc.itemsComplete,
                                    batchesComplete: proc.batchesComplete,
                                    rate: eventsPerSecond,
                                    cpuPercent: cpuPercent
                                });
                            }, bufferDelay);
                        };
                        emitNext();
                    })];
            });
        });
    };
    BufferBenchmark.prototype.printResults = function (results, iterations) {
        console.log("=== Batch Processor Performance Benchmark (iterations=".concat(iterations, ")==="));
        console.log('Name                   | Buffer(ms) | Rate (e/s) | Samples  | Avg Batch  | Batches | Items    | Time (ms±σ)     | CPU %(±σ)');
        console.log('--------------------------------------------------------------------------------------------------------');
        results.forEach(function (result) {
            console.log("".concat(result.name.padEnd(22), " | ") +
                "".concat(result.bufferTimeMs.toString().padStart(9), " | ") +
                "".concat(result.rate.toString().padStart(9), " | ") +
                "".concat(result.samples.toString().padStart(8), " | ") +
                "".concat(result.avgBatchSize.toFixed(1).padStart(10), " | ") +
                "".concat(result.batchesComplete.toString().padStart(7), " | ") +
                "".concat(result.itemsComplete.toString().padStart(8), " | ") +
                "".concat(result.avgTime.toFixed(1).padStart(6), "\u00B1").concat(result.stdDevTime.toFixed(1).padStart(4), " | ") +
                "".concat(result.avgCpu.toFixed(1).padStart(4), "\u00B1").concat(result.stdDevCpu.toFixed(1)));
        });
        console.log('--------------------------------------------------------------------------------------------------------');
    };
    return BufferBenchmark;
}());
// Run the benchmark
var benchmark = new BufferBenchmark();
benchmark.runBenchmark();
