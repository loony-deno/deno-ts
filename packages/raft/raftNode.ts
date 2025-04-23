// deno-lint-ignore-file no-explicit-any
import EventEmitter from "node:events";
import { Tick } from "@scope/timer";
import { modification, Changeable } from "./modification.ts";
import { Entry, Log } from "./raftLog.ts";

enum RAFT_STATE {
  STOPPED = 0,
  LEADER = 1,
  CANDIDATE = 2,
  FOLLOWER = 3,
  CHILD = 4,
}

const RAFT_STATES = [
  RAFT_STATE.STOPPED,
  RAFT_STATE.LEADER,
  RAFT_STATE.CANDIDATE,
  RAFT_STATE.FOLLOWER,
  RAFT_STATE.CHILD,
];

type Packet = {
  state: number;
  term: number;
  address: number;
  type: string;
  leader: number | null;
  last?: any; // Mark as optional since it's conditionally added
  data?: any; // Also optional
};

const change = modification();
/**
 * A nope function for when people don't want message acknowledgements. Because
 * they don't care about CAP.
 *
 * @private
 */
function nope() {}

export class Raft extends EventEmitter {
  beat: number;
  election: {
    min: number;
    max: number;
  } | null;
  votes: {
    for: number | null;
    granted: number;
  };
  threshold: number;
  address: number;
  latency: number;
  nodes: Raft[];
  leader: number | null;
  term: number;
  state: RAFT_STATE;
  states = RAFT_STATES;
  timers: Tick;
  log: null;
  db: Log;

  change: <T extends Changeable>(this: any, changed: Partial<T>) => T;

  constructor(
    address: number,
    options: {
      threshold?: number;
      address: number;
      state?: RAFT_STATE;
      election: {
        min: number;
        max: number;
      };
      heartbeat: number;
    }
  ) {
    super();

    if ("object" === typeof address) options = address;
    else if (!options.address) options.address = address;

    this.election = {
      min: options.election.min || 150,
      max: options.election.max || 300,
    };

    this.beat = options.heartbeat || 50;

    this.votes = {
      for: null, // Who did we vote for in this current term.
      granted: 0, // How many votes we're granted to us.
    };

    this.threshold = options.threshold || 0.8;
    this.address = options.address;
    this.timers = new Tick();
    this.db = new Log();
    this.log = null;
    this.change = change;
    // raft.write = raft.write || options.write || null
    this.latency = 0;
    this.nodes = [];

    //
    // Raft §5.2:
    //
    // When a server starts, it's always started as Follower and it will remain in
    // this state until receive a message from a Leader or Candidate.
    //

    // Our current state.
    this.state = options.state ? options.state : RAFT_STATE.FOLLOWER;

    // Leader in our cluster.
    this.leader = null;

    // Our current term.
    this.term = 0;

    this._initialize(options);
  }

  /**
   * Initialize Raft and start listening to the various of events we're
   * emitting as we're quite chatty to provide the maximum amount of flexibility
   * and reconfigurability.
   *
   * @param {Object} options The configuration you passed in the constructor.
   * @private
   */
  _initialize(options: any) {
    //
    // Reset our vote as we're starting a new term. Votes only last one term.
    //
    this.on("term change", () => {
      this.votes.for = null;
      this.votes.granted = 0;
    });

    //
    // Reset our times and start the heartbeat again. If we're promoted to leader
    // the heartbeat will automatically be broadcasted to users as well.
    //
    this.on("state change", (state) => {
      this.timers.clear(["heartbeat", "election"]);
      this.heartbeat(
        RAFT_STATE.LEADER === this.state ? this.beat : this.timeout()
      );
      this.emit(this.states[state].toString());
    });

    //
    // Receive incoming messages and process them.
    //
    this.on("data", async (packet, write) => {
      write = write || nope;
      let reason;

      if ("object" !== this.type(packet)) {
        reason = "Invalid packet received";
        this.emit("error", new Error(reason));

        return write(await this.packet("error", reason));
      }

      //
      // Raft §5.1:
      //
      // Applies to all states. If a response contains a higher term then our
      // current term need to change our state to FOLLOWER and set the received
      // term.
      //
      // If the raft receives a request with a stale term number it should be
      // rejected.
      //
      if (packet.term > this.term) {
        this.change({
          leader:
            RAFT_STATE.LEADER === packet.state
              ? packet.address
              : packet.leader || this.leader,
          state: RAFT_STATE.FOLLOWER,
          term: packet.term,
        });
      } else if (packet.term < this.term) {
        reason =
          "Stale term detected, received `" +
          packet.term +
          "` we are at " +
          this.term;
        this.emit("error", new Error(reason));

        return write(this.packet("error", reason));
      }

      //
      // Raft §5.2:
      //
      // If we receive a message from someone who claims to be leader and shares
      // our same term while we're in candidate mode we will recognize their
      // leadership and return as follower.
      //
      // If we got this far we already know that our terms are the same as it
      // would be changed or prevented above..
      //
      if (RAFT_STATE.LEADER === packet.state) {
        if (RAFT_STATE.FOLLOWER !== this.state)
          this.change({ state: RAFT_STATE.FOLLOWER });
        if (packet.address !== this.leader)
          this.change({ leader: packet.address });

        //
        // Always when we receive an message from the Leader we need to reset our
        // heartbeat.
        //
        this.heartbeat(this.timeout());
      }

      switch (packet.type) {
        //
        // Raft §5.2:
        // Raft §5.4:
        //
        // A raft asked us to vote on them. We can only vote to them if they
        // represent a higher term (and last log term, last log index).
        //
        case "vote":
          //
          // The term of the vote is bigger then ours so we need to update it. If
          // it's the same and we already voted, we need to deny the vote.
          //
          if (this.votes.for && this.votes.for !== packet.address) {
            this.emit("vote", packet, false);

            return write(await this.packet("voted", { granted: false }));
          }

          //
          // If we maintain a log, check if the candidates log is as up to date as
          // ours.
          //
          if (this.log) {
            const lastInfo = await this.db.getLastInfo();

            if (
              lastInfo &&
              lastInfo.index > packet.last.index &&
              lastInfo.term > packet.last.term
            ) {
              this.emit("vote", packet, false);

              return write(await this.packet("voted", { granted: false }));
            }
          }

          //
          // We've made our decision, we haven't voted for this term yet and this
          // candidate came in first so it gets our vote as all requirements are
          // met.
          //
          this.votes.for = packet.address;
          this.emit("vote", packet, true);
          this.change({ leader: packet.address, term: packet.term });
          write(await this.packet("voted", { granted: true }));

          //
          // We've accepted someone as potential new leader, so we should reset
          // our heartbeat to prevent this raft from timing out after voting.
          // Which would again increment the term causing us to be next CANDIDATE
          // and invalidates the request we just got, so that's silly willy.
          //
          this.heartbeat(this.timeout());
          break;

        //
        // A new incoming vote.
        //
        case "voted":
          //
          // Only accepts votes while we're still in a CANDIDATE state.
          //
          if (RAFT_STATE.CANDIDATE !== this.state) {
            return write(
              await this.packet("error", "No longer a candidate, ignoring vote")
            );
          }

          //
          // Increment our received votes when our voting request has been
          // granted by the raft that received the data.
          //
          if (packet.data.granted) {
            this.votes.granted++;
          }

          //
          // Check if we've received the minimal amount of votes required for this
          // current voting round to be considered valid.
          //
          if (this.quorum(this.votes.granted)) {
            this.change({ leader: this.address, state: RAFT_STATE.LEADER });

            //
            // Send a heartbeat message to all connected clients.
            //
            this.message(
              RAFT_STATE.FOLLOWER,
              await this.packet("append", undefined),
              undefined
            );
          }

          //
          // Empty write, nothing to do.
          //
          write();
          break;

        case "error":
          this.emit("error", new Error(packet.data));
          break;

        case "append": {
          if (!this.log) {
            return;
          }

          const lastInfo = await this.db.getLastInfo();

          // We do not have the last index as our last entry
          // Look back in log in case we have it previously
          // if we do remove any bad uncommitted entries following it
          if (
            lastInfo &&
            packet.last.index !== lastInfo.index &&
            packet.last.index !== 0
          ) {
            const hasIndex = await this.db.has(packet.last.index);

            if (hasIndex) this.db.removeEntriesAfter(packet.last.index);
            else
              return this.message(
                RAFT_STATE.LEADER,
                await this.packet("append fail", {
                  term: packet.last.term,
                  index: packet.last.index,
                }),
                undefined
              );
          }

          if (packet.data) {
            const entry = packet.data[0];
            await this.db.saveCommand(entry.command, entry.term, entry.index);

            this.message(
              RAFT_STATE.LEADER,
              await this.packet("append ack", {
                term: entry.term,
                index: entry.index,
              }),
              undefined
            );
          }

          //if packet commit index not the same. Commit commands
          if (this.db.getCommitIndex() < packet.last.committedIndex) {
            const entries = await this.db.getUncommittedEntriesUpToIndex(
              packet.last.committedIndex
              //   packet.last.term,
            );
            if (entries) {
              this.commitEntries(entries);
            }
          }
          break;
        }
        case "append ack": {
          // :TODO
          // const entry = await this.db.commandAck(
          //   packet.data.index,
          //   packet.address
          // );
          // if (this.quorum(entry.responses.length) && !entry.committed) {
          //   const entries = await this.db.getUncommittedEntriesUpToIndex(
          //     entry.index
          //     //   entry.term,
          //   );
          //   if (entries) {
          //     this.commitEntries(entries);
          //   }
          // }
          // break;
        }
        case "append fail": {
          const previousEntry = await this.db.getEntry(packet.data.index);
          if (previousEntry) {
            const append = await this.appendPacket(previousEntry);
            write(append);
          }
          break;
        }
        //
        // RPC command
        //
        case "exec":
          break;

        //
        // Unknown event, we have no idea how to process this so we're going to
        // return an error.
        //
        default:
          if (this.listeners("rpc").length) {
            this.emit("rpc", packet, write);
          } else {
            write(
              await this.packet("error", "Unknown message type: " + packet.type)
            );
          }
      }
    });

    //
    // We do not need to execute the rest of the functionality below as we're
    // currently running as "child" raft of the cluster not as the "root" raft.
    //
    if (RAFT_STATE.CHILD === this.state) return this.emit("initialize");

    //
    // Setup the log & appends. Assume that if we're given a function log that it
    // needs to be initialized as it requires access to our raft instance so it
    // can read our information like our leader, state, term etc.
    //
    if ("function" === this.type(this.log)) {
      // :TODO
      //   this.log = new Log(raft, options)
    }

    /**
     * The raft is now listening to events so we can start our heartbeat timeout.
     * So that if we don't hear anything from a leader we can promote our selfs to
     * a candidate state.
     *
     * Start listening listening for heartbeats when implementors are also ready
     * with setting up their code.
     *
     * @api private
     */
    // :TODO
    // const initialize = (err: any) => {
    //   if (err) return this.emit("error", err)

    //   this.emit("initialize")
    //   this.heartbeat(this.timeout())
    // }

    // if ("function" === this.type(this._initialize)) {
    //   if (this._initialize.length === 2)
    //     return this._initialize(options, initialize)
    //   this._initialize(options)
    // }

    // initialize()
  }

  /**
   * Proper type checking.
   *
   * @param {Mixed} of Thing we want to know the type of.
   * @returns {String} The type.
   * @private
   */
  type(of: any) {
    return Object.prototype.toString.call(of).slice(8, -1).toLowerCase();
  }

  /**
   * Check if we've reached our quorum (a.k.a. minimum amount of votes requires
   * for a voting round to be considered valid) for the given amount of votes.
   *
   * @param {Number} responses Amount of responses received.
   * @returns {Boolean}
   * @public
   */
  quorum(responses: number) {
    if (!this.nodes.length || !responses) return false;

    return responses >= this.majority();
  }

  /**
   * The majority required to reach our the quorum.
   *
   * @returns {Number}
   * @public
   */
  majority() {
    return Math.ceil(this.nodes.length / 2) + 1;
  }

  /**
   * Attempt to run a function indefinitely until the callback is called.
   *
   * @param {Function} attempt Function that needs to be attempted.
   * @param {Function} fn Completion callback.
   * @param {Number} timeout Which timeout should we use.
   * @returns {Raft}
   * @public
   */
  //   indefinitely(attempt, fn, timeout) {
  //     var uuid = UUID(),
  //       raft = this

  //     ;(function again() {
  //       //
  //       // We need to force async execution here because we do not want to saturate
  //       // the event loop with sync executions. We know that it's important these
  //       // functions are retried indefinitely but if it's called synchronously we will
  //       // not have time to receive data or updates.
  //       //
  //       var next = one(function force(err, data) {
  //         if (!raft.timers) return // We're been destroyed, ignore all.

  //         raft.timers.setImmediate(uuid + "@async", function async() {
  //           if (err) {
  //             raft.emit("error", err)

  //             return again()
  //           }

  //           fn(data)
  //         })
  //       })

  //       //
  //       // Ensure that the assigned callback has the same context as our raft.
  //       //
  //       attempt.call(raft, next)

  //       raft.timers.setTimeout(
  //         uuid,
  //         function timeoutfn() {
  //           next(new Error("Timed out, attempting to retry again"))
  //         },
  //         +timeout || raft.timeout(),
  //       )
  //     })()

  //     return this
  //   }

  /**
   * Start or update the heartbeat of the Raft. If we detect that we've received
   * a heartbeat timeout we will promote our selfs to a candidate to take over the
   * leadership.
   *
   * @param {String|Number} duration Time it would take for the heartbeat to timeout.
   * @returns {Raft}
   * @private
   */
  heartbeat(duration: number | undefined) {
    // var raft = this

    duration = duration || this.beat;

    if (this.timers.active("heartbeat") && duration) {
      this.timers.adjust("heartbeat", duration);

      return this;
    }

    this.timers.setTimeout(
      "heartbeat",
      async () => {
        if (RAFT_STATE.LEADER !== this.state) {
          this.emit("heartbeat timeout");

          return this.promote();
        }

        //
        // According to the raft spec we should be sending empty append requests as
        // heartbeat. We want to emit an event so people can modify or inspect the
        // payload before we send it. It's also a good indication for when the
        // idle state of a LEADER as it didn't get any messages to append/commit to
        // the FOLLOWER'S.
        //
        const packet = await this.packet("append", undefined);

        this.emit("heartbeat", packet);
        this.message(RAFT_STATE.FOLLOWER, packet, undefined).heartbeat(
          this.beat
        );
      },
      duration || 1000
    );

    return this;
  }

  /**
   * Send a message to connected nodes within our cluster. The following messaging
   * patterns (who) are available:
   *
   * - Raft.LEADER   : Send a message to cluster's current leader.
   * - Raft.FOLLOWER : Send a message to all non leaders.
   * - Raft.CHILD    : Send a message to everybody.
   * - <address>     : Send a message to a raft based on the address.
   *
   * @param {Mixed} who Recipient of the message.
   * @param {Mixed} what The data we need to send.
   * @param {Function} when Completion callback
   * @returns {Raft}
   * @public
   */
  message(
    who: RAFT_STATE,
    what: any,
    when: string | ((one: any, two: any) => void) | undefined // :TODO
  ) {
    when = when || nope;

    //
    // If the "who" is undefined, the developer made an error somewhere. Tell them!
    //
    if (typeof who === "undefined") {
      throw new Error(
        "Cannot send message to `undefined`. Check your spelling!"
      );
    }

    let output: any = { errors: {}, results: {} };

    let length = this.nodes.length,
      errors = false,
      i = 0;

    const latency: number[] = [],
      nodes: Raft[] = [];

    switch (who) {
      case RAFT_STATE.LEADER:
        for (; i < length; i++)
          if (this.leader === this.nodes[i].address) {
            nodes.push(this.nodes[i]);
          }
        break;

      case RAFT_STATE.FOLLOWER:
        for (; i < length; i++)
          if (this.leader !== this.nodes[i].address) {
            nodes.push(this.nodes[i]);
          }
        break;

      case RAFT_STATE.CHILD:
        Array.prototype.push.apply(nodes, this.nodes);
        break;

      default:
      // :TODO
      // for (; i < length; i++)
      //   if (who === this.nodes[i].address) {
      //     nodes.push(this.nodes[i])
      //   }
    }

    /**
     * A small wrapper to force indefinitely sending of a certain packet.
     *
     * @param {Raft} client Raft we need to write a message to.
     * @param {Object} data Message that needs to be send.
     * @api private
     */
    const wrapper = (client: any, data1: any) => {
      const start = +new Date();
      const written = (err: any, data: any) => {
        latency.push(+new Date() - start);

        //
        // Add the error or output to our `output` object to be
        // passed to the callback when all the writing is done.
        //
        if (err) {
          errors = true;
          output.errors[client.address] = err;
        } else {
          output.results[client.address] = data;
        }

        //
        // OK, so this is the strange part here. We've broadcasted messages and
        // got replies back. This reply contained data so we need to process it.
        // What if the data is incorrect? Then we have no way at the moment to
        // send back reply to a reply to the server.
        //
        if (err) this.emit("error", err);
        else if (data) this.emit("data", data);

        //
        // Messaging has been completed.
        //
        if (latency.length === length && typeof when === "function") {
          this.timing(latency);
          when(errors ? output.errors : undefined, output.results);
          latency.length = nodes.length = 0;
          output = { errors: {}, results: {} };
        }
      };

      client.write(data1, written);
    };

    length = nodes.length;
    i = 0;

    for (; i < length; i++) {
      wrapper(nodes[i], what);
    }

    return this;
  }

  /**
   * Generate the various of timeouts.
   *
   * @returns {Number}
   * @private
   */
  timeout() {
    const times = this.election;
    if (times) {
      return Math.floor(
        Math.random() * (times.max - times.min + 1) + times.min
      );
    }
  }

  /**
   * Calculate if our average latency causes us to come dangerously close to the
   * minimum election timeout.
   *
   * @param {Array} latency Latency of the last broadcast.
   * @param {Boolean} Success-fully calculated the threshold.
   * @private
   */
  timing(latency: number[]) {
    let sum = 0;
    let i = 0;

    if (RAFT_STATE.STOPPED === this.state) return false;

    for (; i < latency.length; i++) {
      sum += latency[i];
    }

    this.latency = Math.floor(sum / latency.length);

    if (this.election && this.latency > this.election.min * this.threshold) {
      this.emit("threshold");
    }

    return true;
  }

  /**
   * Raft §5.2:
   *
   * We've detected a timeout from the leaders heartbeats and need to start a new
   * election for leadership. We increment our current term, set the CANDIDATE
   * state, vote our selfs and ask all others rafts to vote for us.
   *
   * @returns {Raft}
   * @private
   */
  async promote() {
    this.change({
      state: RAFT_STATE.CANDIDATE, // We're now a candidate,
      term: this.term + 1, // but only for this term.
      leader: "", // We no longer have a leader.
    });

    //
    // Candidates are always biased and vote for them selfs first before sending
    // out a voting request to all other rafts in the cluster.
    //
    this.votes.for = this.address;
    this.votes.granted = 1;

    //
    // Broadcast the voting request to all connected rafts in your private
    // cluster.
    //
    const packet = await this.packet("vote", undefined);

    this.message(RAFT_STATE.FOLLOWER, packet, undefined);

    //
    // Set the election timeout. This gives the rafts some time to reach
    // consensuses about who they want to vote for. If no consensus has been
    // reached within the set timeout we will attempt it again.
    //
    if (this.timers) {
      this.timers.clear(["heartbeat", "election"]);
      const timeout = this.timeout();
      if (timeout) {
        this.timers.setTimeout("election", this.promote, timeout);
      }
    }

    return this;
  }

  /**
   * Wrap the outgoing messages in an object with additional required data.
   *
   * @async
   * @param {String} type Message type we're trying to send.
   * @param {Mixed} data Data to be transfered.
   * @returns {Promise<Object>} Packet.
   * @private
   */
  async packet(type: string, data: any) {
    const wrapped: Packet = {
      state: this.state, // Are we're a leader, candidate or follower.
      term: this.term, // Our current term so we can find mis matches.
      address: this.address, // Address of the sender.
      type: type, // Message type.
      leader: this.leader, // Who is our leader.
    };

    //
    // If we have logging and state replication enabled we also need to send this
    // additional data so we can use it determine the state of this raft.
    //
    if (this.log) wrapped.last = await this.db.getLastInfo();
    if (arguments.length === 2) wrapped.data = data;

    return wrapped;
  }

  /**
   * appendPacket - Send append message with entry and using the previous entry as the last.index and last.term
   *
   * @param {Entry} entry Entry to send as data
   *
   * @return {Promise<object>} Description
   * @private
   */
  async appendPacket(entry: Entry): Promise<{
    state: number;
    term: number;
    address: number;
    type: string;
    leader: number | null;
    data: Entry[];
    last: {
      index: any;
      term: any;
      committedIndex: number;
    } | null;
  }> {
    const last = await this.db.getEntryInfoBefore(entry);
    return {
      state: this.state, // Are we're a leader, candidate or follower.
      term: this.term, // Our current term so we can find mis matches.
      address: this.address, // Address of the sender.
      type: "append", // Append message type .
      leader: this.leader, // Who is our leader.
      data: [entry], // The command to send to the other nodes
      last,
    };
  }

  /**
   * Create a clone of the current instance with the same configuration. Ideally
   * for creating connected nodes in a cluster.. And let that be something we're
   * planning on doing.
   *
   * @param {Object} options Configuration that should override the default config.
   * @returns {Raft} The newly created instance.
   * @public
   */
  clone(options: any) {
    options = options || {};

    const node: any = {
      Log: this.log,
      "election max": this.election?.max,
      "election min": this.election?.min,
      heartbeat: this.beat,
      threshold: this.threshold,
    };

    for (const key in node) {
      if (key in options || !Object.prototype.hasOwnProperty.call(node, key))
        continue;
      options[key] = node[key];
    }

    return this.constructor(options);
  }

  /**
   * A new raft is about to join the cluster. So we need to upgrade the
   * configuration of every single raft.
   *
   * @param {String} address The address of the raft that is connected.
   * @param {Function} write A method that we use to write data.
   * @returns {Raft} The raft we created and that joined our cluster.
   * @public
   */
  join(address: number | null, write: any) {
    // can be function or async function
    if (/function/.test(this.type(address))) {
      write = address;
      address = null;
    }

    //
    // You shouldn't be able to join the cluster as your self. So we're going to
    // add a really simple address check here. Return nothing so people can actually
    // check if a raft has been added.
    //
    if (this.address === address) return;

    const node = this.clone({
      write: write, // Optional function that receives our writes.
      address: address, // A custom address for the raft we added.
      state: RAFT_STATE.CHILD, // We are a raft in the cluster.
    });
    const end = () => {
      this.leave(node);
    };
    node.once("end", end, this);

    this.nodes.push(node);
    this.emit("join", node);

    return node;
  }

  /**
   * Remove a raft from the cluster.
   *
   * @param {String} address The address of the raft that should be removed.
   * @returns {Raft} The raft that we removed.
   * @public
   */
  leave(address: number) {
    let index = -1,
      node;

    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].address === address) {
        node = this.nodes[i];
        index = i;
        break;
      }
    }

    if (~index && node) {
      this.nodes.splice(index, 1);

      if (node.end) node.end();
      this.emit("leave", node);
    }

    return node;
  }

  /**
   * This Raft needs to be shut down.
   *
   * @returns {Boolean} Successful destruction.
   * @public
   */
  end() {
    if (RAFT_STATE.STOPPED === this.state) return false;
    this.change({ state: RAFT_STATE.STOPPED });

    if (this.nodes.length)
      for (let i = 0; i < this.nodes.length; i++) {
        this.leave(this.nodes[i].address);
      }

    this.emit("end");
    this.timers.end(["heartbeat", "election"]);
    this.removeAllListeners();

    if (this.log) this.db.end();
    this.timers = new Tick();

    this.log = this.election = null;
    // this.beat = null; :TODO
    return true;
  }

  /**
   * Raft §5.3:
   * command - Saves command to log and replicates to followers
   *
   * @param {type} command Json command to be stored in the log
   *
   * @return {Promise<void>} Description
   */
  async command(command: string) {
    // let raft = this

    if (this.state !== RAFT_STATE.LEADER) {
      const err = new Error("NOTLEADER");

      //   err.leaderAddress = this.leader

      throw err;
    }

    // about to send an append so don't send a heart beat
    // raft.heartbeat(raft.beat);
    const entry = await this.db.appendEntry({
      command,
      term: this.term,
      commited: false,
    });
    const appendPacket = await this.appendPacket(entry);
    this.message(RAFT_STATE.FOLLOWER, appendPacket, undefined);
  }

  /**
   * commitEntries - Commites entries in log and emits commited entries
   *
   * @param {Entry[]} entries Entries to commit
   * @return {Promise<void>}
   */
  async commitEntries(entries: Entry[]) {
    entries.forEach(async (entry: Entry) => {
      await this.db.commit(entry.index);
      this.emit("commit", entry.command);
    });
  }
}

// Raft.states = "STOPPED,LEADER,CANDIDATE,FOLLOWER,CHILD".split(",")
// for (var s = 0; s < Raft.states.length; s++) {
//   Raft[Raft.states[s]] = s
// }
