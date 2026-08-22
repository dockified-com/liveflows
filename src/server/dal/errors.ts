export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * The caller is authenticated and may know the resource exists, but lacks the
 * permission for this specific operation.
 *
 * Do NOT use this when the caller should not learn the resource exists at all
 * — throw NotFoundError instead. Leaking existence through a 403 is the exact
 * failure this distinction prevents. See docs/specs/0005-authorization.md.
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
