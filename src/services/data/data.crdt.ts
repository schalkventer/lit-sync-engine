import * as Automerge from "@automerge/automerge";
import { type Data } from "./data.helpers";
import { type Task } from "../../entities/tasks";
import { createIDBData } from "./data.idb";
import { Repo, DocHandle } from "@automerge/automerge-repo";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

type Listener = (contents: Record<string, Task>) => void;
type Subscribe = (listener: Listener) => Promise<void>;

type CRDTData = Data & {
  subscribe: Subscribe;
  toBinary: () => Promise<Blob>;
  fromBinary: (blob: Blob) => Promise<void>;
};

const AUTO_MERGE_LOCAL_KEY = "88e0d47e-7fd8-47d9-9b91-f477ba0ba73a";

let prev: CRDTData | null = null;

export const createCRDTData = (): CRDTData => {
  if (prev) return prev;

  const local: any = window.localStorage.getItem(AUTO_MERGE_LOCAL_KEY);

  const repo = new Repo({
    storage: new IndexedDBStorageAdapter(),
    network: [new BroadcastChannelNetworkAdapter()],
  });

  const db = createIDBData();

  const mount: Promise<DocHandle<Record<string, Task>>> = local
    ? repo.find(local)
    : Promise.resolve(repo.create<Record<string, Task>>({}));

  const listeners = new Set<Listener>();

  const subscribe: Subscribe = async (listener) => {
    listeners.add(listener);
    const current = await mount;

    if (current) {
      listener(current.doc());
    }
  };

  const init = async () => {
    const inner = await mount;
    window.localStorage.setItem(AUTO_MERGE_LOCAL_KEY, inner.url);
    inner.on("change", (event) => {
      const nextDoc = event.doc;

      for (const listener of listeners) {
        listener(nextDoc);
      }
    });
  };

  const set = async (fn: (current: Record<string, Task>) => void) => {
    await db.set(fn);
    const inner = await mount;
    inner.change(fn);
    return {} as any;
  };

  const toBinary: () => Promise<Blob> = async () => {
    const handle = await mount;
    const doc = handle.doc();
    const binary = Automerge.save(doc);

    return new Blob([binary as any], {
      type: "application/octet-stream",
    });
  };

  const fromBinary = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();
    const binary = new Uint8Array(buffer);
    const doc = Automerge.load<Record<string, Task>>(binary);
    const handle = await mount;

    handle.change(() => doc);
    db.set(() => doc);
  };

  const instance: CRDTData = {
    ...db,
    set,
    subscribe,
    toBinary,
    fromBinary,
  };

  init();
  prev = instance;
  return instance;
};
