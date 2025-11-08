import { schema } from "../../entities/tasks";
import { produce } from "immer";
import { sort as sortFn } from "fast-sort";
import { z } from "zod";
import { type Data, UUID_KEY } from "./data.helpers";

let prev: Data | null = null;

export const createLocalData = (): Data => {
  if (prev) return prev;

  const get: Data["get"] = async () => {
    const raw = localStorage.getItem(UUID_KEY);

    if (!raw) {
      localStorage.setItem(UUID_KEY, JSON.stringify({}));
      return {};
    }

    const inner = JSON.parse(raw);
    const result = z.record(z.string(), schema).parse(inner);
    return result;
  };

  const set: Data["set"] = async (mutate) => {
    const inner = await get();
    const next = produce(inner, mutate);
    const parsed = z.record(z.string(), schema).parse(next);
    localStorage.setItem(UUID_KEY, JSON.stringify(parsed));
    return parsed;
  };

  const result: Data = {
    get,
    set,

    async query(props) {
      const { filter, sort, page = 1, count = 50, reverse } = props;
      const fn = reverse ? ("asc" as const) : ("desc" as const);
      const inner = Object.values(await get());
      const filtered = inner.filter(filter);
      const sorted = sortFn(filtered)[fn](sort);

      if (!props.count) {
        return Object.fromEntries(sorted.map((t) => [t.id, t]));
      }

      const start = (page - 1) * count;
      const sliced = sorted.slice(start, start + count);

      return Object.fromEntries(sliced.map((t) => [t.id, t]));
    },
  };

  prev = result;
  return result;
};
