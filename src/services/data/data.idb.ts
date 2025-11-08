import { openDB } from "idb";
import { type Task, schema } from "../../entities/tasks";
import { produce } from "immer";
import { type Data, UUID_KEY } from "./data.helpers";
import { sort as sortFn } from "fast-sort";
import { z } from "zod";

let prev: Data | null = null;

export const createIDBData = (): Data => {
  if (prev) return prev;

  const init = openDB(UUID_KEY, 1, {
    upgrade(db) {
      db.createObjectStore("data", { keyPath: "id" });
    },
  });

  const get: Data["get"] = async () => {
    const db = await init;
    const result = await db.getAll("data");
    return Object.fromEntries(result.map((item) => [item.id, item]));
  };

  const set: Data["set"] = async (mutate) => {
    const db = await init;
    const inner = await get();
    const next = produce(inner, mutate);
    const parsed = z.record(z.string(), schema).parse(next);

    Object.values(parsed).forEach(async (item) => {
      await db.put("data", item);
    });

    return parsed;
  };

  const result: Data = {
    get,
    set,

    query: async (props: {
      filter: (item: Task) => boolean;
      sort: (item: Task) => string | number | boolean | Date;
      reverse?: boolean;
      count?: number;
      page?: number;
    }): Promise<Record<string, Task>> => {
      return new Promise((resolve) => {
        const { filter, sort, page = 1, count = 50, reverse } = props;
        const fn = reverse ? ("asc" as const) : ("desc" as const);

        init.then(async (db) => {
          const tx = db.transaction("data", "readonly");
          const store = tx.objectStore("data");
          const matches: Task[] = [];

          let cursor = await store.openCursor();

          while (cursor) {
            const value = cursor.value as Task;
            if (filter(value)) {
              matches.push(value);
            }

            cursor = await cursor.continue();
          }

          await tx.done;

          const result = sortFn(matches)[fn](sort);

          if (!props.count) {
            resolve(Object.fromEntries(result.map((item) => [item.id, item])));
            return;
          }

          const index = page > 0 ? (page - 1) * count : 0;

          resolve(
            Object.fromEntries(
              result
                .slice(index || 0, index + count)
                .map((item) => [item.id, item])
            )
          );
        });
      });
    },
  };

  prev = result;
  return result;
};
