import { Router } from "jsr:@oak/oak/router";
import { encrypt, decrypt } from "../libs/aes/index.ts";
const cryptoRoutes = new Router();

cryptoRoutes.post("/encrypt", async (ctx) => {
  const body = ctx.request.body;
  if (body.type() === "json") {
    const data = await body.json();
    const { text, password } = data;
    try {
      const res = await encrypt(text, password);
      ctx.response.body = {
        data: res,
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { error };
    }
  } else {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON format" };
  }
});

cryptoRoutes.post("/decrypt", async (ctx) => {
  const body = ctx.request.body;
  if (body.type() === "json") {
    const data = await body.json();
    const { text, password } = data;
    try {
      const res = await decrypt(text, password);
      ctx.response.body = {
        data: res,
      };
    } catch (error) {
      console.log(error);
      ctx.response.status = 500;
      ctx.response.body = { error };
    }
  } else {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid JSON format" };
  }
});

export default cryptoRoutes;
