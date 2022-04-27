import { db } from "~/utils/db.server";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { compare, hash } from "bcrypt";
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

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // normally you want this to be `secure: true`
    // but that doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
    return user;
  } catch {
    throw logout(request);
  }
}
export async function logout(request: Request) {
  const session = await getUserSession(request);

  return redirect("/jokes", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function register(username: string, password: string) {
  const newUser = await db.user.create({
    data: { username, passwordHash: await hash(password, 10) },
  });
  return { id: newUser.id, username };
}
