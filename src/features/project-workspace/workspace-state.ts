export type WorkspaceLayout =
  | { kind: "empty" }
  | { kind: "single"; activeFileId: string; openIds: string[] }
  | {
      kind: "split";
      leftFileId: string;
      rightFileId: string;
      openIds: string[];
      dividerRatio: number;
    };

export type WorkspaceState = {
  layout: WorkspaceLayout;
  mobileVisibleParticipant: "left" | "right" | null;
};

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  layout: { kind: "empty" },
  mobileVisibleParticipant: null,
};

function clampRatio(ratio: number): number {
  return Math.min(0.8, Math.max(0.2, ratio));
}

export function openFile(
  state: WorkspaceState,
  fileId: string,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty") {
    return {
      ...state,
      layout: {
        kind: "single",
        activeFileId: fileId,
        openIds: [fileId],
      },
    };
  }

  const openIds = layout.openIds.includes(fileId)
    ? layout.openIds
    : [...layout.openIds, fileId];

  if (layout.kind === "single") {
    return {
      ...state,
      layout: {
        kind: "single",
        activeFileId: fileId,
        openIds,
      },
    };
  }

  // split layout retains split when opening a file
  return {
    ...state,
    layout: {
      ...layout,
      openIds,
      // activate on the left side or keep current left if opening right
      leftFileId: layout.rightFileId === fileId ? layout.leftFileId : fileId,
      rightFileId: layout.rightFileId === fileId ? fileId : layout.rightFileId,
    },
  };
}

export function closeFile(
  state: WorkspaceState,
  fileId: string,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty") return state;

  const newOpenIds = layout.openIds.filter((id) => id !== fileId);
  if (newOpenIds.length === 0) {
    return {
      layout: { kind: "empty" },
      mobileVisibleParticipant: null,
    };
  }

  if (layout.kind === "single") {
    let nextActive = layout.activeFileId;
    if (layout.activeFileId === fileId) {
      const closedIndex = layout.openIds.indexOf(fileId);
      const nextIndex = Math.min(closedIndex, newOpenIds.length - 1);
      nextActive = newOpenIds[nextIndex];
    }
    return {
      ...state,
      layout: {
        kind: "single",
        activeFileId: nextActive,
        openIds: newOpenIds,
      },
    };
  }

  // split layout
  const isLeftClosed = layout.leftFileId === fileId;
  const isRightClosed = layout.rightFileId === fileId;

  if (isLeftClosed || isRightClosed) {
    if (newOpenIds.length === 1) {
      const remaining = newOpenIds[0];
      return {
        ...state,
        layout: {
          kind: "single",
          activeFileId: remaining,
          openIds: newOpenIds,
        },
        mobileVisibleParticipant: null,
      };
    }

    const survivingSide = isLeftClosed ? layout.rightFileId : layout.leftFileId;
    const closedIndex = layout.openIds.indexOf(fileId);
    const candidateIndex = Math.min(closedIndex, newOpenIds.length - 1);
    let nextOther = newOpenIds[candidateIndex];
    if (nextOther === survivingSide) {
      nextOther =
        newOpenIds.find((id) => id !== survivingSide) ?? survivingSide;
    }

    return {
      ...state,
      layout: {
        kind: "split",
        leftFileId: isLeftClosed ? nextOther : survivingSide,
        rightFileId: isLeftClosed ? survivingSide : nextOther,
        openIds: newOpenIds,
        dividerRatio: layout.dividerRatio,
      },
    };
  }

  return {
    ...state,
    layout: {
      ...layout,
      openIds: newOpenIds,
    },
  };
}

export function activateFile(
  state: WorkspaceState,
  fileId: string,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty" || !layout.openIds.includes(fileId)) return state;

  if (layout.kind === "single") {
    return {
      ...state,
      layout: {
        ...layout,
        activeFileId: fileId,
      },
    };
  }

  // If in split, bring active to left pane if it's not already visible
  if (layout.leftFileId === fileId || layout.rightFileId === fileId) {
    return state;
  }

  return {
    ...state,
    layout: {
      ...layout,
      leftFileId: fileId,
    },
  };
}

export function reorderTabs(
  state: WorkspaceState,
  fromIndex: number,
  toIndex: number,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty") return state;
  if (
    fromIndex < 0 ||
    fromIndex >= layout.openIds.length ||
    toIndex < 0 ||
    toIndex >= layout.openIds.length
  ) {
    return state;
  }

  const openIds = [...layout.openIds];
  const [moved] = openIds.splice(fromIndex, 1);
  openIds.splice(toIndex, 0, moved);

  return {
    ...state,
    layout: {
      ...layout,
      openIds,
    },
  };
}

export function splitWith(
  state: WorkspaceState,
  leftId: string,
  rightId: string,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty" || leftId === rightId) return state;

  const openIds = [...layout.openIds];
  if (!openIds.includes(leftId)) openIds.push(leftId);
  if (!openIds.includes(rightId)) openIds.push(rightId);

  const dividerRatio = layout.kind === "split" ? layout.dividerRatio : 0.5;

  return {
    ...state,
    layout: {
      kind: "split",
      leftFileId: leftId,
      rightFileId: rightId,
      openIds,
      dividerRatio: clampRatio(dividerRatio),
    },
  };
}

export function replaceSplitSide(
  state: WorkspaceState,
  side: "left" | "right",
  fileId: string,
): WorkspaceState {
  const { layout } = state;
  if (layout.kind !== "split") return state;

  const openIds = layout.openIds.includes(fileId)
    ? layout.openIds
    : [...layout.openIds, fileId];

  const otherSide = side === "left" ? layout.rightFileId : layout.leftFileId;
  if (fileId === otherSide) return state;

  return {
    ...state,
    layout: {
      ...layout,
      openIds,
      leftFileId: side === "left" ? fileId : layout.leftFileId,
      rightFileId: side === "right" ? fileId : layout.rightFileId,
    },
  };
}

export function closeSplit(state: WorkspaceState): WorkspaceState {
  const { layout } = state;
  if (layout.kind !== "split") return state;

  return {
    ...state,
    layout: {
      kind: "single",
      activeFileId: layout.leftFileId,
      openIds: layout.openIds,
    },
    mobileVisibleParticipant: null,
  };
}

export function reconcileAuthorized(
  state: WorkspaceState,
  authorizedIds: string[],
): WorkspaceState {
  const { layout } = state;
  if (layout.kind === "empty") return state;

  const authSet = new Set(authorizedIds);
  const validOpenIds = layout.openIds.filter((id) => authSet.has(id));

  if (validOpenIds.length === 0) {
    return {
      layout: { kind: "empty" },
      mobileVisibleParticipant: null,
    };
  }

  if (layout.kind === "single") {
    const activeValid = authSet.has(layout.activeFileId);
    const activeFileId = activeValid ? layout.activeFileId : validOpenIds[0];
    return {
      ...state,
      layout: {
        kind: "single",
        activeFileId,
        openIds: validOpenIds,
      },
    };
  }

  // split
  const leftValid = authSet.has(layout.leftFileId);
  const rightValid = authSet.has(layout.rightFileId);

  if (validOpenIds.length === 1 || (!leftValid && !rightValid)) {
    const activeFileId = leftValid
      ? layout.leftFileId
      : rightValid
        ? layout.rightFileId
        : validOpenIds[0];
    return {
      ...state,
      layout: {
        kind: "single",
        activeFileId,
        openIds: validOpenIds,
      },
      mobileVisibleParticipant: null,
    };
  }

  const leftFileId = leftValid
    ? layout.leftFileId
    : (validOpenIds.find((id) => id !== layout.rightFileId) ?? validOpenIds[0]);
  const rightFileId = rightValid
    ? layout.rightFileId
    : (validOpenIds.find((id) => id !== leftFileId) ?? validOpenIds[0]);

  return {
    ...state,
    layout: {
      kind: "split",
      leftFileId,
      rightFileId,
      openIds: validOpenIds,
      dividerRatio: clampRatio(layout.dividerRatio),
    },
  };
}

export function setMobileVisible(
  state: WorkspaceState,
  participant: "left" | "right" | null,
): WorkspaceState {
  if (state.layout.kind === "empty") {
    return { ...state, mobileVisibleParticipant: null };
  }
  return {
    ...state,
    mobileVisibleParticipant: participant,
  };
}
