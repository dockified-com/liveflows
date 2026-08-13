import { auth } from "@clerk/nextjs/server";
import { createHash, randomBytes } from "crypto";
import { db } from "../db";
import { NotFoundError, UnauthorizedError } from "./errors";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPersonalAccessToken(name: string) {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  const rawToken = "lf_" + randomBytes(24).toString("hex");
  const tokenHash = hashToken(rawToken);

  const pat = await db.personalAccessToken.create({
    data: {
      userId,
      name,
      tokenHash,
    },
  });

  return { id: pat.id, name: pat.name, rawToken, createdAt: pat.createdAt };
}

export async function listPersonalAccessTokens() {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  return db.personalAccessToken.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deletePersonalAccessToken(id: string) {
  const { userId } = await auth();
  if (!userId) throw new UnauthorizedError();

  const pat = await db.personalAccessToken.findUnique({
    where: { id },
  });

  if (!pat || pat.userId !== userId) {
    throw new NotFoundError("Personal access token not found");
  }

  await db.personalAccessToken.delete({
    where: { id },
  });
}

export async function verifyPersonalAccessToken(token: string) {
  const tokenHash = hashToken(token);

  const pat = await db.personalAccessToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!pat) {
    return null;
  }

  // Update lastUsedAt asynchronously
  void db.personalAccessToken
    .update({
      where: { id: pat.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(console.error);

  return pat.user;
}
