import {
  setImmediate,
  setInterval,
  setTimeout,
  clearImmediate,
  clearInterval,
  clearTimeout,
} from "node:timers";

const TIMEOUT = 3000;

class Timer {
  name: string;
  fn?: VoidFunction;
  timer?: NodeJS.Timeout | NodeJS.Immediate;
  start: number;
  duration: number;
  type: string;

  constructor(name: string, fn: VoidFunction, duration: number, type: string) {
    this.name = name;
    this.fn = fn;
    this.duration = duration;
    this.start = +new Date();
    this.type = type;
  }

  remaining() {
    return this.duration - this.taken();
  }

  taken() {
    return +new Date() - this.start;
  }

  setTimer(timer: NodeJS.Timeout | NodeJS.Immediate) {
    this.timer = timer;
  }
}

class Tick {
  timers: Record<string, Timer>;
  constructor() {
    this.timers = {};
  }

  setTimeout(name: string, fn: VoidFunction, duration: number) {
    const newTimer = new Timer(name, fn, duration, "timeout");
    newTimer.setTimer(setTimeout(fn, TIMEOUT));
    this.timers[name] = newTimer;
  }

  setInterval(name: string, fn: VoidFunction, duration: number) {
    const newTimer = new Timer(name, fn, duration, "interval");
    newTimer.setTimer(setInterval(fn, TIMEOUT));
    this.timers[name] = newTimer;
  }

  setImmediate(name: string, fn: VoidFunction) {
    const newTimer = new Timer(name, fn, 0, "immediate");
    newTimer.setTimer(setImmediate(fn));
    this.timers[name] = newTimer;
  }

  clear(names: string[]) {
    names.forEach((name) => {
      const currentTimer = this.timers[name];
      if (name === "timeout") {
        clearTimeout(currentTimer.timer as NodeJS.Timeout);
      } else if (name === "interval") {
        clearInterval(currentTimer.timer as NodeJS.Timeout);
      } else if (name === "immediate" && currentTimer.name) {
        clearImmediate(currentTimer.timer as NodeJS.Immediate);
      }
    });
  }

  active(name: string) {
    if (!this.timers) return;
    return name in this.timers;
  }

  adjust(name: string, duration: number) {
    const timer = this.timers[name];
    this.clear([timer.type]);
    if (timer.type === "timeout") {
      this.setTimeout(name, timer.fn ? timer.fn : voidfn, duration);
    } else if (timer.type === "interval") {
      this.setInterval(name, timer.fn ? timer.fn : voidfn, duration);
    } else if (timer.type === "immediate") {
      this.setImmediate(name, timer.fn ? timer.fn : voidfn);
    }
  }

  check() {}

  end(names: string[]) {
    this.clear(names);
    this.timers = {};

    return true;
  }
}

export { Tick };

function voidfn() {}
