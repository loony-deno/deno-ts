// deno run --allow-net --allow-read --unstable mod.ts
import { Client } from "https://deno.land/x/postgres/mod.ts";
import "jsr:@std/dotenv/load";

const user = Deno.env.get("PG_USERNAME");
const database = Deno.env.get("PG_DATABASE");
const hostname = Deno.env.get("PG_HOSTNAME");
const password = Deno.env.get("PG_PASSWORD");
const port = Deno.env.get("PG_PORT");

export const client = new Client({
  user,
  database,
  hostname,
  password,
  port,
});
