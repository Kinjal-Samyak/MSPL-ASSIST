import { IntervalSyncScheduler } from "../../excel/interval-sync.scheduler";

describe("IntervalSyncScheduler", () => {
  it("should_schedule_job_and_expose_next_run", async () => {
    jest.useFakeTimers();
    const scheduler = new IntervalSyncScheduler();
    const execute = jest.fn().mockResolvedValue(undefined);

    scheduler.schedule({
      id: "job-1",
      intervalMs: 1000,
      execute,
    });

    expect(scheduler.getNextRunAt()).not.toBeNull();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(1);
    scheduler.stop();
    expect(scheduler.getNextRunAt()).toBeNull();
    jest.useRealTimers();
  });
});
