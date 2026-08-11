const activeTasks = new Map<string, Promise<any>>();

export function enqueueTask<T>(
  workspaceId: string,
  taskFn: () => Promise<T>
): Promise<T> {
  const previousTask = activeTasks.get(workspaceId) ?? Promise.resolve();

  const nextTask = previousTask
    .catch(() => {}) // Suppress previous errors
    .then(taskFn);

  activeTasks.set(workspaceId, nextTask);

  nextTask.finally(() => {
    // Clean up if we are the last task in the queue for this workspace
    if (activeTasks.get(workspaceId) === nextTask) {
      activeTasks.delete(workspaceId);
    }
  }).catch(() => {});

  return nextTask;
}

// For testing purposes
export const _getQueueForTest = () => activeTasks;
