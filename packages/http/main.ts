import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

import aes from "./aes.ts";
import pg from "./pg/index.ts";

const router = new Router();

router.use(aes.routes());
router.use(pg.routes());

router.get("/", (ctx) => {
  ctx.response.body = "Hello World!";
});

const app = new Application();
app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = 2000;
app.listen({ port: PORT });
console.log(`Listening on port ${PORT}`);
