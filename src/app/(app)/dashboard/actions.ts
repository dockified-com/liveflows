"use server";

import { revalidatePath } from "next/cache";
import {
  createPersonalAccessToken,
  deletePersonalAccessToken,
} from "@/server/dal/pats";

export async function createTokenAction(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name || name.trim() === "") return { error: "Name is required" };

  try {
    const token = await createPersonalAccessToken(name.trim());
    revalidatePath("/dashboard");
    return { token: token.rawToken };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteTokenAction(id: string) {
  try {
    await deletePersonalAccessToken(id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
