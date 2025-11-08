import { createLocalData } from "../data";

type Listener = (state: boolean) => void;

type Instance = {
  run: () => Promise<void>;
  setToken: (value: string | null) => void;
  subscribe: (listener: Listener) => () => void;
};

let instance: null | Instance = null;

export const createLocalSync = () => {
  if (instance) return instance;
  const local = createLocalData();

  let token: string | null = null;
  let fileId: string | null = null;
  let state: boolean = false;

  const listeners = new Set<Listener>();

  const handler = async () => {
    if (!token) return;

    state = true;
    listeners.forEach((fn) => fn(true));

    try {
      const checkResponse = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='yet-another-todo-app.json' and trashed=false&fields=files(id,name)",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const listData = await checkResponse.json();
      const file = listData.files?.[0];
      fileId = file?.id || null;

      if (!file) {
        const createResponse = await fetch(
          "https://www.googleapis.com/drive/v3/files",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "yet-another-todo-app.json",
              mimeType: "application/json",
            }),
          }
        );

        const created = await createResponse.json();
        fileId = created.id;
      }

      const content = JSON.stringify(await local.get());

      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: content,
        }
      );
    } finally {
      state = false;
      listeners.forEach((fn) => fn(false));
    }
  };

  setInterval(handler, 1 * 3 * 1000);

  const inner: Instance = {
    run: handler,

    setToken: (value: string | null) => {
      token = value;
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener);
      listener(state);

      return () => {
        listeners.delete(listener);
      };
    },
  };

  instance = inner;
  return inner;
};
