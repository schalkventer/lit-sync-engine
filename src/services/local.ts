import { type Task, schema } from "../entities/tasks";
import { z } from "zod";

const LOCAL_KEY = "468e639f-c339-46ab-91ce-13b90bf00cf4";

export const local = {
  set: (data: Record<string, Task>) => {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(z.record(z.string(), schema).parse(data))
    );
  },

  get: (): Record<string, Task> => {
    const data = localStorage.getItem(LOCAL_KEY);

    if (!data) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({}));
      return {};
    }

    return z.record(z.string(), schema).parse(JSON.parse(data));
  },
};
