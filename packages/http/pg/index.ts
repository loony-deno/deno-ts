import { Router } from "jsr:@oak/oak/router";
import { client, openaiClient } from "./connection.ts";

const pgRoutes = new Router();

pgRoutes.get("/get/users", async (ctx) => {
  await client.connect();
  const result = await client.queryArray(
    "SELECT uid, fname, lname, email FROM users"
  );
  await client.end();
  ctx.response.body = result.rows.map((user: any) => ({
    user_id: user[0],
    fname: user[1],
    lname: user[2],
    email: user[3],
  }));
});

pgRoutes.get("/test/openAi", async (ctx) => {
  console.log("/test/openAi");
  try {
    const response = await openaiClient.responses.create({
      model: "gpt-4o",
      instructions: "You are a coding assistant that talks like a pirate",
      input: "Are semicolons optional in JavaScript?",
    });
    console.log(response);
    ctx.response.body = response.output_text;
  } catch (error) {
    console.log(error);
    ctx.response.body = "Error";
  }
});

export default pgRoutes;
