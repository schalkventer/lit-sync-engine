import { initializeApp } from "firebase/app";
import { z } from "zod";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

const LOCAL_KEY = "e7c63837-bbd7-4f17-8cfd-d7c1b02fb82f";

const value = z.object({
  email: z.email().nullable(),
  token: z.string().nullable(),
});

const local = {
  get: () => {
    const data = window.localStorage.getItem(LOCAL_KEY);

    const fallback = {
      email: null,
      token: null,
    };

    if (!data) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(fallback));
      return fallback;
    }

    return value.parse(JSON.parse(data));
  },

  set: (value: Value) =>
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value)),
};

export type Subscription = (value: Value) => void;

type Instance = {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  get: () => Value;
  subscribe: (fn: Subscription) => () => void;
};

const firebaseConfig = {
  apiKey: "AIzaSyBdcwfib-iPKwyEqkqyEZOVO7QnBzTwsGY",
  authDomain: "lit-sync-engine-9d1f0.firebaseapp.com",
  projectId: "lit-sync-engine-9d1f0",
  storageBucket: "lit-sync-engine-9d1f0.firebasestorage.app",
  messagingSenderId: "96729084979",
  appId: "1:96729084979:web:7735952f0453d28c979f46",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/drive");

export type Value = {
  email: string | false | null;
  token: string | null;
};

let instance: Instance | null = null;

export const createAuth = () => {
  if (instance) return instance;

  let listeners: Subscription[] = [];

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      local.set({ email: null, token: null });
      listeners.forEach((fn) => fn({ email: null, token: null }));
      return;
    }

    const saved = local.get().token;
    const inner: Value = { email: user.email, token: saved };
    local.set(inner);

    listeners.forEach((fn) => fn(inner));
  });

  function get() {
    return local.get();
  }

  const subscribe = (listener: Subscription) => {
    listeners.push(listener);
    listener(local.get());

    return () => {
      listeners = listeners.filter((x) => x !== listener);
    };
  };

  const login = async () => {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const inner: Value = {
      email: result.user.email,
      token: credential?.accessToken ?? null,
    };

    local.set(inner);
    listeners.forEach((fn) => fn(inner));
  };

  const logout = async () => {
    listeners.forEach((fn) =>
      fn({
        email: false,
        token: null,
      })
    );
    await auth.signOut();
  };

  // const refresh = async (): Promise<string | null> => {
  //   console.log(user);

  // if (!user) return null;

  // user.
  // const token = await user.getIdToken(true);
  // return token;
  // };

  const inner: Instance = {
    get,
    subscribe,
    login,
    logout,
  };

  instance = inner;
  return inner;
};
