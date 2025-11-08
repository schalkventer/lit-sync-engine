import { type Task } from "../../entities/tasks";

export const UUID_KEY = "c45fa223-7a67-4a28-a641-4bdfa0f40f4b";

export interface Data {
  get(): Promise<Record<string, Task>>;

  set(
    mutate: (current: Record<string, Task>) => void
  ): Promise<Record<string, Task>>;

  query(props: {
    filter: (item: Task) => boolean;
    sort: (item: Task) => string | number | boolean | Date;
    reverse?: boolean;
    count?: number;
    page?: number;
  }): Promise<Record<string, Task>>;
}
