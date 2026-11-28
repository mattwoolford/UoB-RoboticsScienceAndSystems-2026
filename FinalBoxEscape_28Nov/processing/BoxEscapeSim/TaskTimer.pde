/**
 * Exact port of firmware/BoxEscape/TaskTimer.h & TaskTimer.cpp.
 */
class TaskTimer_c {
  private long interval_ms;
  private long last_reset_ms;

  TaskTimer_c() {
    this(0);
  }

  TaskTimer_c(long interval_ms) {
    this.interval_ms = interval_ms;
    this.last_reset_ms = 0;
  }

  void setIntervalMS(long new_interval_ms) {
    this.interval_ms = new_interval_ms;
  }

  boolean isReady(long now_ms) {
    return (now_ms - last_reset_ms) >= interval_ms;
  }

  boolean isReady() {
    return isReady(millis());
  }

  void resetTimer(long now_ms) {
    last_reset_ms = now_ms;
  }

  void resetTimer() {
    resetTimer(millis());
  }
}
