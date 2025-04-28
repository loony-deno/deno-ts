// deno-lint-ignore-file no-explicit-any
import { Raft, Packet } from "@scope/raft-v1";
import net from "node:net";
import process from "node:process";

//
// Create a custom Raft instance which uses a plain TCP server and client to
// communicate back and forth.
//
class TCPRaft extends Raft {
  /**
   * Initialized, start connecting all the things.
   *
   * @param {Object} options Options.
   * @api private
   */
  initialize() {
    // var raft = this;

    const server = net
      .createServer((socket) => {
        socket.on("data", (buff) => {
          const data = JSON.parse(buff.toString());

          console.log(this.address + ":packet#data", data);
          this.emit("data", data, (data: any) => {
            console.log(this.address + ":packet#reply", data);
            socket.write(JSON.stringify(data));
            socket.end();
          });
        });
      })
      .listen(this.address);

    this.once("end", function enc() {
      server.close();
    });
  }

  /**
   * The message to write.
   *
   * @TODO implement indefinitely sending of packets.
   * @param {Object} packet The packet to write to the connection.
   * @param {Function} fn Completion callback.
   * @api private
   */
  write(packet: Packet, fn: any) {
    const socket = net.connect(this.address);

    console.log(this.address + ":packet#write", packet);
    socket.on("error", fn);
    socket.on("data", (buff) => {
      let data;

      try {
        data = JSON.parse(buff.toString());
      } catch (e) {
        return fn(e);
      }

      console.log(this.address + ":packet#callback", packet);
      fn(undefined, data);
    });

    socket.setNoDelay(true);
    socket.write(JSON.stringify(packet));
  }
}

if (import.meta.main) {
  //
  // We're going to start with a static list of servers. A minimum cluster size is
  // 4 as that only requires majority of 3 servers to have a new leader to be
  // assigned. This allows the failure of one single server.
  //
  const ports = [8081, 8082, 8083, 8084, 8085, 8086];

  //
  // The port number of this Node process.
  //
  const port = process.env.PORT ? +process.env.PORT : ports[0];

  //
  // Now that we have all our variables we can safely start up our server with our
  // assigned port number.
  //
  const raft = new TCPRaft(port, {
    election: {
      min: 2000,
      max: 5000,
    },
    heartbeat: 1000,
    address: port,
  });

  raft.on("heartbeat timeout", () => {
    console.log("heart beat timeout, starting election");
  });

  raft
    .on("term change", (to, from) => {
      console.log("were now running on term %s -- was %s", to, from);
    })
    .on("leader change", function (to, from) {
      console.log("we have a new leader to: %s -- was %s", to, from);
    })
    .on("state change", function (to, from) {
      console.log("we have a state to: %s -- was %s", to, from);
    });

  raft.on("leader", () => {
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
    console.log("I am elected as leader");
    console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
  });

  raft.on("candidate", () => {
    console.log("----------------------------------");
    console.log("I am starting as candidate");
    console.log("----------------------------------");
  });

  //
  // Join in other nodes so they start searching for each other.
  //
  ports.forEach((nr) => {
    if (!nr || port === nr) return;

    raft.join(nr, undefined);
  });

  raft.initialize();
}
