import { Subject } from 'rxjs';
import { bufferTime } from 'rxjs/operators';


interface BatchProcessor<T> {
  name: string;
  bufferTimeMs: number;
  batchesComplete: number;
  itemsComplete: number;
  lastProcTime: number;
  addItem(item: T): void;
  start(): void;
  stop(): void;
  getAvgBatchSize(): number;
}

class RxJSBatchProcessor<T> implements BatchProcessor<T> {
  private subject;
  public bufferTimeMs: number;
  private subscription: any;
  public batchesComplete: number;
  public itemsComplete: number;
  public lastProcTime: number;

  constructor(public name: string, bufferTimeMs: number,
    private readonly processItems: (items: T[]) => void) {
    this.bufferTimeMs = bufferTimeMs;
  }

  addItem(item: T): void {
    this.subject.next(item);
  }

  start(): void {
    this.batchesComplete = 0;
    this.itemsComplete = 0;
    this.subject = new Subject();
    this.subscription = this.subject.
      pipe(
        bufferTime(this.bufferTimeMs)
      )
      .subscribe(items => {
        this.batchesComplete++;
        this.itemsComplete += items.length;
        if (items.length > 0) {
          this.processItems(items);
          this.lastProcTime = performance.now();
        }
      });
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getAvgBatchSize(): number {
    return this.itemsComplete / this.batchesComplete;
  }
}


class TimerBatchProcessor<T> implements BatchProcessor<T> {
  private buffer: T[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  public bufferTimeMs: number;
  public batchesComplete: number;
  public itemsComplete: number;
  public lastProcTime: number;

  constructor(public name: string, bufferTimeMs: number,
    private readonly processItems: (items: T[]) => void) {
    this.bufferTimeMs = bufferTimeMs;
  }

  addItem(item: T): void {
    this.buffer.push(item);
  }

  start(): void {
    this.batchesComplete = 0;
    this.itemsComplete = 0;
    this.intervalId = setInterval(() => {
      this.batchesComplete++;
      this.itemsComplete+=this.buffer.length;
      if (this.buffer.length > 0) {
        this.processItems([...this.buffer]);
        this.lastProcTime = performance.now();
        this.buffer = [];
      }
    }, this.bufferTimeMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getAvgBatchSize(): number {
    return this.itemsComplete / this.batchesComplete;
  }
}



type Result = {
  name: string,
  bufferTimeMs: number,
  rate: number;
  cpuPercent: number;
  samples: number,
  processingTime: number,
  avgBatchSize: number,
  batchesComplete: number,
  itemsComplete: number,
};
interface StatResult extends Result {
  avgTime: number;
  stdDevTime: number;
  avgCpu: number;
  stdDevCpu: number;
}
class BufferBenchmark {
  private results: StatResult[] = [];

  private calculateStats(runs: Result[]): StatResult {
    const avgTime = runs.reduce((sum, r) => sum + r.processingTime, 0) / runs.length;
    const avgCpu = runs.reduce((sum, r) => sum + r.cpuPercent, 0) / runs.length;

    // Calculate standard deviations
    const stdDevTime = Math.sqrt(
      runs.reduce((sum, r) => sum + Math.pow(r.processingTime - avgTime, 2), 0) / runs.length
    );
    const stdDevCpu = Math.sqrt(
      runs.reduce((sum, r) => sum + Math.pow(r.cpuPercent - avgCpu, 2), 0) / runs.length
    );

    // Use the last run for other metrics, as they should be consistent
    const lastRun = runs[runs.length - 1];
    return {
      ...lastRun,
      avgTime,
      stdDevTime,
      avgCpu,
      stdDevCpu
    };
  }

  async runBenchmark() {
    // Test different emission rates (events per second)

    // Example processor function
    const processItems = (items: number[]) => {
      return;
    };
    const processItemsWithSum = (items: number[]) => {
      let sum=0;
      for(const item of items){
        sum += item*item;
      }
      return sum;
    };


    // Create instances with 250ms buffer time
    const rxProcessor = new RxJSBatchProcessor<number>('rxjs',250, processItems);
    const timerProcessor = new TimerBatchProcessor<number>('interval',250, processItems);
    const rxSumProcessor = new RxJSBatchProcessor<number>('rxjs-sum',250, processItemsWithSum);
    const timerSumProcessor = new TimerBatchProcessor<number>('interval-sum',250, processItemsWithSum);
    const rxQuickSumProcessor = new RxJSBatchProcessor<number>('rxjs-quick-sum',150, processItemsWithSum);
    const timerQuickSumProcessor = new TimerBatchProcessor<number>('interval-quick-sum',150, processItemsWithSum);

    // const emissionRates = [1, 100, 1e5];
    const emissionRates = [1, 10, 100, 1e3, 1e4, 1e5, 5e5, 1e6, 56, 1e7];
    const processors = [
      rxProcessor, 
      timerProcessor,
      rxSumProcessor,
      timerSumProcessor,
      rxQuickSumProcessor,
      timerQuickSumProcessor
    ]
    const iterations = 5; // Number of times to run each benchmark

    
    for (const rate of emissionRates) {
      for (const proc of processors) {
        console.log(`Benchmark for ${proc.name}->${rate}`);
        const runs: Result[] = [];

        // Run multiple iterations
        for (let i = 0; i < iterations; i++) {
          const result = await this.benchmarkRate(rate, proc);
          runs.push(result);
          // Optional: Add delay between runs
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate statistics
        const statResult = this.calculateStats(runs);
        this.results.push(statResult);
      }
    }

    this.printResults(this.results,iterations);
  }


  private async benchmarkRate(eventsPerSecond: number, proc: BatchProcessor<number>): Promise<Result> {
    return new Promise((resolve) => {
      const samples = eventsPerSecond * 3; // Total events to test
      const bufferDelay = 1000; // Wait 1s after last event to ensure processing

      const start = performance.now();
      const startCpu = process.cpuUsage();
      let emitted = 0;
  
      proc.start();
  
      // For low rates, we need to ensure proper timing between events
      const interval = 1000 / eventsPerSecond;
      const minInterval = 50; // Minimum interval in ms
  
      const emitNext = () => {
        if (emitted < samples) {
          proc.addItem(emitted++);
  
          // For high rates, emit multiple events per cycle
          if (interval < minInterval) {
            const batchSize = Math.min(Math.floor(minInterval / interval), samples - emitted);
            for (let i = 0; i < batchSize; i++) {
              proc.addItem(emitted++);
            }
          }
  
          if (emitted < samples) {
            setTimeout(emitNext, Math.max(interval, minInterval));
          } else {
            finishBenchmark();
          }
        }
      };
  
      const finishBenchmark = () => {
        setTimeout(() => {
          const now = proc.lastProcTime;
          const cpuUsage = process.cpuUsage(startCpu);
          const processingTime = now - start;
  
          // Convert from microseconds to milliseconds and calculate percentage
          const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
          const cpuPercent = (totalCpuMs / processingTime) * 100;
  
          proc.stop();
  
          resolve({
            name: proc.name,
            bufferTimeMs: proc.bufferTimeMs,
            samples,
            processingTime,
            avgBatchSize: proc.getAvgBatchSize(),
            itemsComplete: proc.itemsComplete,
            batchesComplete: proc.batchesComplete,
            rate: eventsPerSecond,
            cpuPercent
          });
        }, bufferDelay);
      };
  
      emitNext();
    });
  }

  private printResults(results: StatResult[], iterations: number) {
    console.log(`=== Batch Processor Performance Benchmark (iterations=${iterations})===`);
    console.log('Name                   | Buffer(ms) | Rate (e/s) | Samples | Avg Batch | Batches | Items  | Time (ms±σ)     | CPU %(±σ)');
    console.log('--------------------------------------------------------------------------------------------------------');
  
    results.forEach(result => {
      console.log(
        `${result.name.padEnd(22)} | ` +
        `${result.bufferTimeMs.toString().padStart(9)} | ` +
        `${result.rate.toString().padStart(9)} | ` +
        `${result.samples.toString().padStart(7)} | ` +
        `${result.avgBatchSize.toFixed(1).padStart(9)} | ` +
        `${result.batchesComplete.toString().padStart(7)} | ` +
        `${result.itemsComplete.toString().padStart(6)} | ` +
        `${result.avgTime.toFixed(1).padStart(6)}±${result.stdDevTime.toFixed(1).padStart(4)} | ` +
        `${result.avgCpu.toFixed(1).padStart(4)}±${result.stdDevCpu.toFixed(1)}`
      );
    });
    console.log('--------------------------------------------------------------------------------------------------------');
  }
}

// Run the benchmark
const benchmark = new BufferBenchmark();
benchmark.runBenchmark();
