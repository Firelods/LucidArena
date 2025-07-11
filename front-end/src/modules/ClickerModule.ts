export class ClickerModule {
  private clickCount = 0;
  private startTime = 0;
  private endTime = 60_000;

  startGame() {
    this.clickCount = 0;
    this.startTime = Date.now();
    this.endTime = this.startTime + 60_000; // 1 minute
  }

  isTimeUp(): boolean {
    return Date.now() > this.endTime;
  }
  click() {
    if (this.isTimeUp()) {
      console.log("Time's up! Final score: ", this.clickCount);
      return;
    }
    this.clickCount++;
    console.log('Click count: ', this.clickCount);
  }

  getClicks(): number {
    return this.clickCount;
  }

  getRemainingTime(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.endTime - elapsed);
  }
}
