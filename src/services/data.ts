import * as Automerge from "@automerge/automerge";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { DocHandle, Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { type Task } from "../entities/tasks";

const AUTO_MERGE_LOCAL_KEY = "88e0d47e-7fd8-47d9-9b91-f477ba0ba73a";

export type Contents = Record<string, Task>;

export type Data = {
  mutate: (fn: (current: Contents) => void) => void;
  subscribe: (listener: (doc: Contents) => void) => () => void;
  toFile: () => Promise<void>;
  fromFile: (file: File) => Promise<void>;
};

let prev: null | Data = null;

export const createData = () => {
  if (prev) return prev;
  const local: any = window.localStorage.getItem(AUTO_MERGE_LOCAL_KEY);

  const repo = new Repo({
    storage: new IndexedDBStorageAdapter(),
    network: [new BroadcastChannelNetworkAdapter()],
  });

  const mount: Promise<DocHandle<Contents>> = local
    ? repo.find(local)
    : Promise.resolve(repo.create<Contents>({}));

  type Listener = (contents: Contents) => void;
  const listeners = new Set<Listener>();

  const subscribe = (listener: Listener) => {
    mount.then((inner) => {
      listeners.add(listener);
      const current = inner.doc();

      if (current) {
        listener(current);
      }
    });

    return () => {
      listeners.delete(listener);
    };
  };

  mount.then((inner) => {
    window.localStorage.setItem(AUTO_MERGE_LOCAL_KEY, inner.url);

    inner.on("change", (event) => {
      const nextDoc = event.doc;

      for (const listener of listeners) {
        listener(nextDoc);
      }
    });
  });

  const mutate = async (fn: (current: Contents) => void) => {
    const inner = await mount;
    inner.change(fn);
  };

  const toFile = async () => {
    const handle = await mount;
    const doc = handle.doc();
    const uint8: any = Automerge.save(doc);

    const blob = new Blob([uint8], {
      type: "application/octet-stream",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yet-another-todo-app.data.bin";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fromFile = async (file: File) => {
    const handle = await mount;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const inner = Automerge.load<Contents>(bytes);
    console.log(inner);
    handle.change(() => inner);
  };

  const instance: Data = {
    toFile,
    mutate,
    subscribe,
    fromFile,
  };

  prev = instance;
  return instance;
};
