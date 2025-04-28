import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import config from "./config/raft.json" with { type: "json" };

enum Tables {
  RAFT_LOG = "raft_log",
  RAFT_META = "raft_meta",
}

export interface AddEntry {
  index?: number;
  term: number;
  command: string;
  commited?: number;
}

export interface Entry {
  index: number;
  term: number;
  command: string;
  commited: number;
}

export class Log {
  private db: DB;
  private commitIndex: number;
  private lastApplied: number;

  constructor(path = config.db_path) {
    this.db = new DB(path);
    this.init_log();
    this.commitIndex = this.getMeta("commit_index");
    this.lastApplied = this.getMeta("last_applied");
  }

  init_log() {
    if (!this.tableExists(Tables.RAFT_LOG)) {
      this.createRaftLogTable();
    }

    if (!this.tableExists(Tables.RAFT_META)) {
      this.createRaftMetaTable();
      this.initMeta("commit_index", 0);
      this.initMeta("last_applied", 0);
    }
  }

  private initMeta(key: string, defaultValue: number) {
    const existing = this.db.query(
      `SELECT value FROM ${Tables.RAFT_META} WHERE key = ?`,
      [key]
    );
    if (existing.length === 0) {
      this.db.query(
        `INSERT INTO ${Tables.RAFT_META} (key, value) VALUES (?, ?)`,
        [key, defaultValue]
      );
    }
  }

  tableExists(tableName: string): boolean {
    const result = this.db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result.length > 0;
  }

  createRaftLogTable() {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS ${Tables.RAFT_LOG} (
        idx INTEGER PRIMARY KEY AUTOINCREMENT,
        term INTEGER NOT NULL,
        command TEXT NOT NULL,
        commited BOOLEAN NOT NULL
      );
    `);
  }

  createRaftMetaTable() {
    this.db.execute(`
      CREATE TABLE IF NOT EXISTS ${Tables.RAFT_META} (
        key TEXT PRIMARY KEY,
        value INTEGER
      );
    `);
  }

  appendEntry(entry: AddEntry, result?: boolean): Entry | null {
    this.db.query<[number, string, number]>(
      `INSERT INTO ${Tables.RAFT_LOG} (term, command, commited) VALUES (?, ?, ?)`,
      [entry.term, entry.command, 0]
    );
    if (result) {
      const lastInsertRowId = this.db.lastInsertRowId
      const rows = this.getEntry(lastInsertRowId)
      if (rows) {
        return {
          ...entry,
          index: rows.index,
          commited: 0,
        };
      }
    }
    return null
  }

  saveCommand(command: string, term: number, index: number): Entry | null {
    return this.appendEntry({
      term,
      command,
      index,
      commited: 0,
    });
  }

  appendEntries(entries: Entry[]): void {
    const insert = this.db.prepareQuery(
      `INSERT INTO ${Tables.RAFT_LOG} (idx, term, command, commited) VALUES (?, ?, ?, ?)`
    );
    try {
      this.db.transaction(() => {
        for (const e of entries) {
          insert.execute([e.index, e.term, e.command, false]);
        }
      });
    } finally {
      insert.finalize();
    }
  }

  getLastLogIndex(): number {
    const result = this.db.query(`SELECT MAX(idx) FROM ${Tables.RAFT_LOG}`);
    for (const [index] of result) return (index as number) ?? 0;
    return 0;
  }

  getLastLogTerm(): number {
    const result = this.db.query(
      `SELECT term FROM ${Tables.RAFT_LOG} ORDER BY idx DESC LIMIT 1`
    );
    for (const [term] of result) return term as number;
    return 0;
  }

  getPrevLogIndex(): number {
    const last = this.getLastLogIndex();
    return last > 0 ? last - 1 : 0;
  }

  getPrevLogTerm(): number {
    const prev = this.getPrevLogIndex();
    const result = this.db.query(
      `SELECT term FROM ${Tables.RAFT_LOG} WHERE idx = ?`,
      [prev]
    );
    for (const [term] of result) return term as number;
    return 0;
  }

  getCommitIndex(): number {
    if (this.commitIndex) return this.commitIndex;
    return this.getMeta("commit_index");
  }

  setCommitIndex(index: number): void {
    this.setMeta("commit_index", index);
  }

  getLastApplied(): number {
    if (this.lastApplied) return this.lastApplied;
    return this.getMeta("last_applied");
  }

  private setLastApplied(index: number): void {
    this.setMeta("last_applied", index);
  }

  private getMeta(key: string): number {
    const result = this.db.query(
      `SELECT value FROM ${Tables.RAFT_META} WHERE key = ?`,
      [key]
    );
    for (const [value] of result) return value as number;
    return 0;
  }

  private setMeta(key: string, value: number): void {
    this.db.query(`UPDATE ${Tables.RAFT_META} SET value = ? WHERE key = ?`, [
      value,
      key,
    ]);
  }

  getEntry(index: number): Entry | null {
    const result = this.db.query<[number, number, string, number]>(
      `SELECT idx, term, command, commited FROM ${Tables.RAFT_LOG} WHERE idx = ?`,
      [index]
    );
    for (const [index, term, command, commited] of result) {
      return {
        index: index as number,
        term: term as number,
        command: command as string,
        commited,
      };
    }
    return null;
  }

  getEntries(fromIndex: number, toIndex: number): Entry[] {
    const data: Entry[] = [
      ...this.db.query<[number, number, string, number]>(
        `SELECT idx, term, command, commited FROM ${Tables.RAFT_LOG} WHERE idx >= ? AND idx < ? ORDER BY idx ASC`,
        [fromIndex, toIndex]
      ),
    ].map(([index, term, command, commited]) => ({
      index: index,
      term,
      command,
      commited,
    }));
    return data;
  }

  applyEntries(): void {
    const lastApplied = this.getLastApplied();
    const commitIndex = this.getCommitIndex();
    const entries = this.getEntries(lastApplied + 1, commitIndex + 1);
    for (const entry of entries) {
      this.applyToStateMachine(entry);
      this.setLastApplied(entry.index);
    }
  }

  applyToStateMachine(entry: Entry): void {
    // 🔧 This is where you'd apply the entry to your state machine.
    console.log(
      `[apply] @ index=${entry.index} term=${entry.term} command=${entry.command}`
    );
  }

  getLastEntry(): {
    index: number;
    term: number;
    command: string;
  } | null {
    const result = this.db.query<[number, number, string]>(
      `SELECT idx, term, command FROM ${Tables.RAFT_LOG} ORDER BY idx DESC LIMIT 1`
    );
    for (const row of result) {
      return {
        index: row[0],
        term: row[1],
        command: row[2],
      };
    }
    return null;
  }

  removeEntriesAfter(index: number) {
    this.db.query(`DELETE FROM ${Tables.RAFT_LOG} WHERE idx > ?`, [index]);
  }

  has(index: number) {
    const entry = this.db.query(
      `SELECT idx FROM ${Tables.RAFT_LOG} WHERE idx=${index}`
    );
    if (entry.length > 0) return true;
    return false;
  }

  async getUncommittedEntriesUpToIndex(index: number) {
    // Get current commit index
    const rows = await this.db.query<[number]>(
      `SELECT value FROM ${Tables.RAFT_META} WHERE key = ?`,
      ["commit_index"]
    );

    for (const [commitIndex] of rows) {
      if (index <= commitIndex) {
        return []; // Nothing uncommitted up to this index
      }
    }

    // Fetch uncommitted entries up to the given index
    for (const [commitIndex] of rows) {
      const entries: Entry[] = await this.db
        .query<[number, number, string, number]>(
          `SELECT idx, term, command FROM ${Tables.RAFT_LOG} WHERE id > ? AND id <= ? ORDER BY id ASC`,
          [commitIndex, index]
        )
        .map(([index, term, command, commited]) => ({
          index: index,
          term,
          command,
          commited,
        }));
      return entries;
    }

    return null;
  }

  async getEntryInfoBefore(entry: Entry) {
    if (!entry || typeof entry.index !== "number") {
      throw new Error("Invalid entry provided");
    }

    const sql = `
      SELECT idx, term, command
      FROM raft_log
      WHERE idx < ?
      ORDER BY idx DESC
      LIMIT 1
    `;

    const rows = await this.db.query<[number, number, string]>(sql, [
      entry.index,
    ]);

    if (rows.length === 0) {
      return null; // No entry before
    }

    for (const [index, term, command] of rows) {
      return {
        index,
        term,
        committedIndex: this.commitIndex,
      };
    }
    return null;
  }

  getLastInfo() {
    return this.getLastEntry();
  }

  commit(index: number): void {
    this.db.query(
      `
      UPDATE ${Tables.RAFT_LOG}
      SET commited = ?
      WHERE idx = ?
    `,
      [1, index]
    );
  }

  close(): void {
    return this.db.close();
  }

  end() {
    return this.close();
  }
}
