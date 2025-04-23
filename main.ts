import { Log } from "@scope/raft";

if (import.meta.main) {
  const db = new Log();

  db.appendEntry({ command: "set x 1", term: 1 });
  db.appendEntry({ command: "set y 1", term: 1 });
  db.appendEntry({ command: "set x 1", term: 1 });
  db.appendEntry({ command: "set y 1", term: 1 });

  const res = db.getEntries(0, 10);
  console.log(res);

  const lastLogIndex = db.getLastLogIndex();
  const lastEntry = db.getLastEntry();
  console.log({
    lastLogIndex,
    lastEntry,
  });

  const entryInfoBefore = await db.getEntryInfoBefore(res[2]);
  console.log({
    entryInfoBefore,
  });
}
