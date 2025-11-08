import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { produce } from "immer";
import { type Task, createTask } from "../entities/tasks";
import { createCRDTData } from "../services/data";
import { createAuth } from "../services/auth";
import { createCRDTSync } from "../services/sync";
import { faker } from "@faker-js/faker";

type Tasks = Record<string, Task>;

type Controls = {
  search: string;
  reversed: boolean;
  completed: "any" | "none" | "only";
};

@customElement("app-crdt")
export class AppCRDT extends LitElement {
  auth = createAuth();
  data = createCRDTData();
  sync = createCRDTSync();

  @state()
  syncing: boolean = false;

  @state()
  controls: Controls = {
    search: "",
    reversed: false,
    completed: "any",
  };

  @state()
  tasks: Record<string, Task> = {};

  @state()
  user: string | false | null = null;

  async query() {
    const response = await this.data.query({
      sort: (item) => item.title,
      reverse: this.controls.reversed,
      filter: (item) => {
        if (this.controls.search) {
          const search = this.controls.search.toLowerCase();
          if (!item.title.toLowerCase().includes(search)) return false;
        }

        if (this.controls.completed === "only" && !item.completed) return false;
        if (this.controls.completed === "none" && item.completed) return false;

        return true;
      },
    });

    this.tasks = response;
  }

  mutate = {
    controls: async (fn: (current: Controls) => void) => {
      const next = produce(this.controls, fn);
      this.controls = next;
      await this.query();
    },

    tasks: async (fn: (current: Tasks) => void) => {
      await this.data.set(fn);
    },
  };

  connectedCallback(): void {
    super.connectedCallback();

    this.sync.subscribe((state) => {
      this.syncing = state;
    });

    this.auth.subscribe((value) => {
      this.sync.setToken(value.token);
      this.user = value.email;
    });

    this.data.subscribe(() => {
      this.query();
    });

    this.query();
  }

  render() {
    return html`
      <header>
        <h2>Yet Another Todo App</h2>

        <form
          @submit=${(event: any) => {
            event.preventDefault();
            const { target } = event;

            if (!(target instanceof HTMLFormElement)) {
              throw new Error("Expected target to be a HTMLFormElement");
            }

            const title = new FormData(target).get("title");
            const newTask = createTask({ title: String(title) });

            this.mutate.tasks((x) => {
              x[newTask.id] = newTask;
            });

            target.reset();
          }}
        >
          <input name="title" placeholder="Task Title" required />
          <button type="submit">Add Task</button>
        </form>

        <h2>Filters</h2>

        <div>
          <label>
            <input
              type="checkbox"
              ?checked=${this.controls.reversed}
              @change=${() => {
                this.mutate.controls((x) => {
                  x.reversed = !x.reversed;
                });
              }}
            />
            <span>Reverse</span>
          </label>
        </div>

        <div>
          <label>
            <span>Completed:</span>
            <select
              @change=${(event: any) => {
                const target = event.target;
                this.mutate.controls((x) => {
                  x.completed = target.value;
                });
              }}
            >
              <option value="any">Any</option>
              <option value="none">None</option>
              <option value="only">Only</option>
            </select>
          </label>
        </div>

        <div>
          <input
            type="search"
            placeholder="Search Tasks"
            @input=${(event: any) => {
              const target = event.target;
              this.mutate.controls((x) => {
                x.search = target.value;
              });
            }}
          />
        </div>

        <h2>Tasks</h2>

        <div>
          ${this.controls.search ? `Results for "${this.controls.search}"` : ""}
        </div>

        <ul>
          ${Object.keys(this.tasks).map((id) => {
            const item = this.tasks[id];

            return html`
              <li>
                <input
                  type="checkbox"
                  ?checked=${this.tasks[id].completed}
                  @change=${() => {
                    this.mutate.tasks((x) => {
                      x[id].completed = !x[id].completed;
                    });
                  }}
                />
                <span>${item.title}</span>
              </li>
            `;
          })}
        </ul>

        <div>Total Tasks: ${Object.keys(this.tasks).length}</div>

        <hr />

        ${this.user}

        <button
          @click=${() => {
            this.user ? this.auth.logout() : this.auth.login();
          }}
        >
          ${this.user ? "Logout" : "Login"}
        </button>

        <button @click=${() => this.sync.run()}>Sync Now</button>
        <div>Sync: ${this.syncing ? "⚠ Running" : "Idle"}</div>

        <hr />

        <button
          @click=${() => {
            const titles = Array.from({ length: 1000 }).map(() =>
              faker.commerce.productName()
            );

            this.mutate.tasks((x) => {
              titles.forEach((title) => {
                const newTask = createTask({ title });
                x[newTask.id] = newTask;
              });
            });
          }}
        >
          ADD 1000 ITEMS
        </button>

        <button
          @click=${() => {
            const titles = Array.from({ length: 5000 }).map(() =>
              faker.commerce.productName()
            );

            this.mutate.tasks((x) => {
              titles.forEach((title) => {
                const newTask = createTask({ title });
                x[newTask.id] = newTask;
              });
            });
          }}
        >
          ADD 5000 ITEMS
        </button>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-crdt": AppCRDT;
  }
}
