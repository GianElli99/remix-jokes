import { db } from "~/utils/db.server";
import { createCookieSessionStorage } from "@remix-run/node";
import { compare } from "bcrypt";
import type { User } from "@prisma/client";

type LoginForm = {
  username: string;
  password: string;
};

export const login = async ({
  username,
  password,
}: LoginForm): Promise<Pick<User, "id" | "username"> | null> => {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return null;
  }

  const validPassword = await compare(password, user.passwordHash);
  if (!validPassword) {
    return null;
  }

  return { username, id: user.id };
};

type UserSession = {
  userId: string;
  redirectTo: string;
};
export const createUserSession = async ({
  userId,
  redirectTo,
}: UserSession) => {
  const sessionStorage = createCookieSessionStorage();
};
