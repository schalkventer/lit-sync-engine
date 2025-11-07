import { z } from "zod";

export const schema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  completed: z.boolean().default(false),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().nullable(),
  archived: z.boolean().default(false),
});

export type Task = z.infer<typeof schema>;

export const createTask = (props: { title: string }): Task => {
  const { title } = props;

  return schema.parse({
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date(),
    updatedAt: null,
    archived: false,
  });
};
