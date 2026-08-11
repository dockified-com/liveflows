import { describe, expect, it, vi } from "vitest";
import { _getQueueForTest, enqueueTask } from "../queue";

describe("enqueueTask", () => {
  it("executes tasks sequentially", async () => {
    const order: number[] = [];
    const task1 = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            order.push(1);
            resolve();
          }, 10),
        ),
    );
    const task2 = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          order.push(2);
          resolve();
        }),
    );

    const p1 = enqueueTask("workspace-1", task1);
    const p2 = enqueueTask("workspace-1", task2);

    await Promise.all([p1, p2]);

    expect(order).toEqual([1, 2]);
    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
  });

  it("suppresses errors from previous tasks and continues execution", async () => {
    const task1 = vi.fn().mockRejectedValue(new Error("Task 1 failed"));
    const task2 = vi.fn().mockResolvedValue("Task 2 success");

    const p1 = enqueueTask("workspace-error", task1);
    const p1Expect = expect(p1).rejects.toThrow("Task 1 failed");

    const p2 = enqueueTask("workspace-error", task2);

    await p1Expect;
    await expect(p2).resolves.toBe("Task 2 success");
  });

  it("queues concurrent requests in correct sequential order", async () => {
    const order: number[] = [];
    const createTask = (num: number, delayMs: number) => () =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          order.push(num);
          resolve();
        }, delayMs),
      );

    const p1 = enqueueTask("workspace-concurrent", createTask(1, 15));
    const p2 = enqueueTask("workspace-concurrent", createTask(2, 5));
    const p3 = enqueueTask("workspace-concurrent", createTask(3, 10));

    await Promise.all([p1, p2, p3]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("cleans up the queue map when empty", async () => {
    const taskFn = () => Promise.resolve("done");

    expect(_getQueueForTest().size).toBe(0);

    const p1 = enqueueTask("workspace-cleanup", taskFn);
    expect(_getQueueForTest().size).toBe(1);

    await p1;

    // Allow finally block to execute
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(_getQueueForTest().size).toBe(0);
  });
});
