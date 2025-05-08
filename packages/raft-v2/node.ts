// deno-lint-ignore-file

import EventEmitter from "node:events";

interface LogEntry {
  term: number;
  command: string;
}

const HEARTBEAT_INTERVAL = 1500;
const ELECTION_TIMER = 3000;

enum RAFT_STATE {
  STOPPED = 0,
  LEADER = 1,
  CANDIDATE = 2,
  FOLLOWER = 3,
  CHILD = 4,
}

export enum MESSAGE {
  TERM_CHANGE = "TC",
  STATE_CHANGE = "SC",
  DATA = "DATA",
  PING = "PING",
}

export type Packet = {
  state: number;
  term: number;
  address: number;
  type: string;
  leader: number | null;
  candidateId?: number;
  leaderId?: number;
  last?: any; // Mark as optional since it's conditionally added
  data?: any; // Also optional
};

export class RaftNode extends EventEmitter {
  id: number;
  peers: number[];
  // peers: ConnectedPeers | undefined

  state: RAFT_STATE;
  term: number;
  vote: {
    for: number | null;
    granted: number;
  };
  log: LogEntry[];
  // commitIndex: number
  // lastApplied: number
  leaderId: number | null;
  electionTimeout: number;
  heartbeatInterval: number;
  electionTimer: number | null;
  write: any;

  constructor(id: number, peers: number[]) {
    super();
    this.id = id;
    this.peers = peers;
    this.state = RAFT_STATE.FOLLOWER;
    this.term = 0;
    this.vote = {
      for: null,
      granted: 0,
    };
    this.log = [];
    // this.commitIndex = 0
    // this.lastApplied = 0
    this.leaderId = null;
    this.electionTimeout = this.resetElectionTimeout();
    this.heartbeatInterval = 1500;
    this.electionTimer = null;
    this.__initialize();
  }

  __initialize() {
    this.on("setter", (a, b) => {
      console.log(a, b);
    });

    this.startElectionTimer();
  }

  resetElectionTimeout(): number {
    return Math.floor(
      Math.random() * (ELECTION_TIMER - HEARTBEAT_INTERVAL) + HEARTBEAT_INTERVAL
    );
  }

  startElectionTimer(): void {
    if (this.electionTimer) clearTimeout(this.electionTimer);
    this.electionTimer = setTimeout(
      () => this.startElection(),
      this.electionTimeout
    );
  }

  async startElection() {}

  async startElectionSafe(): Promise<void> {
    this.state = RAFT_STATE.CANDIDATE;
    this.term++;
    this.vote = {
      for: this.id,
      granted: 1,
    };
    console.log(
      `Node ${this.id} is starting an election for term ${this.term}`
    );

    await Promise.all(
      this.peers.map(async (peer) => {
        try {
          const res = await fetch(`${peer}/vote`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              term: this.term,
              candidateId: this.id,
            }),
          }).then((res) => res.json());

          if (res.voteGranted) this.vote.granted++;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error("Vote request failed", error.message);
        }
      })
    );

    if (this.vote.granted > Math.floor((this.peers.length + 1) / 2)) {
      this.becomeLeader();
    } else {
      this.startElectionTimer();
    }
  }

  becomeLeader(): void {
    this.state = RAFT_STATE.LEADER;
    this.leaderId = this.id;
    console.log(`Node ${this.id} is now the leader`);
    this.sendHeartbeats();
  }

  async sendHeartbeats(): Promise<void> {
    if (this.state !== RAFT_STATE.LEADER) return;

    setInterval(async () => {
      await Promise.all(
        this.peers.map(async (peer) => {
          try {
            await fetch(`${peer}/heartbeat`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                term: this.term,
                leaderId: this.id,
              }),
            }).then((res) => res.json());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            console.error("Heartbeat failed", error.message);
          }
        })
      );
    }, this.heartbeatInterval);
  }

  handleVoteRequest(packet: Packet): boolean {
    const { term, candidateId } = packet;
    if (term > this.term) {
      this.term = term;
      if (candidateId) {
        this.vote.for = candidateId;
      }
      this.startElectionTimer();
      return true;
    } else {
      return false;
    }
  }

  handleHeartbeat(packet: Packet): boolean {
    const { term, leaderId } = packet;
    if (term >= this.term) {
      this.term = term;
      if (leaderId) {
        this.leaderId = leaderId;
      }
      this.state = RAFT_STATE.FOLLOWER;
      this.startElectionTimer();
    }
    if (term / 10 === 0) {
      console.clear();
    }
    return true;
  }

  async sendLogAppendEntryToPeers(entry: LogEntry) {
    await Promise.all(
      this.peers.map(async (peer) => {
        try {
          await fetch(`${peer}/appendEntry`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              term: this.term,
              entry,
            }),
          }).then((res) => res.json());

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          console.error("Vote request failed", error.message);
        }
      })
    );
  }
}
