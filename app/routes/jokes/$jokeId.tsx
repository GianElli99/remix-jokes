import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { json } from "@remix-run/node";

import { db } from "~/utils/db.server";
import type { Joke } from "@prisma/client";

interface LoaderData {
  joke: Joke;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { jokeId } = params;
  const joke = await db.joke.findUnique({ where: { id: jokeId } });

  if (!joke) {
    throw new Error("Joke not found");
  }
  return json<LoaderData>({ joke });
};

export default function JokeRoute() {
  const { joke } = useLoaderData<LoaderData>();
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      <Link to=".">{joke.name} Permalink</Link>
    </div>
  );
}
