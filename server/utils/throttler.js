import config from '../config/env.js';

class Throttler {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.lastCallTime = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCallTime = Date.now();
  }
}

export default new Throttler(config.throttleMs);
