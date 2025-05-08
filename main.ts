// deno-lint-ignore-file no-explicit-any
import process from "node:process";
import { RaftNode } from "@scope/raft-v2";

if (import.meta.main) {
  const ports = [2000, 2001, 2002];
  const port = process.env.PORT ? +process.env.PORT : ports[0];

  class RaftHandler extends RaftNode {}

  const raft = new RaftHandler(port, ports);

  Deno.serve({ port, hostname: "127.0.0.1" }, (req) => {
    if (req.headers.get("upgrade") != "websocket") {
      return new Response(null, { status: 501 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.addEventListener("open", () => {
      console.log("a client connected!");
    });
    socket.addEventListener("message", (event) => {
      console.log(event.data);
      raft.emit("data", event.data);
    });

    const write = (data: any) => {
      socket.send(data);
    };
    raft.write = write;
    raft.emit("setter", "a", "b");

    return response;
  });
}
