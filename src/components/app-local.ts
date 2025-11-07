import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { produce } from "immer";
import { type Task, createTask } from "../entities/tasks";
import { local } from "../services/local";
import { sort } from "fast-sort";

type Tasks = Record<string, Task>;

type Controls = {
  search: string;
  reversed: boolean;
  completed: "any" | "none" | "only";
};

@customElement("app-local")
export class AppLocal extends LitElement {
  @state()
  controls: Controls = {
    search: "",
    reversed: false,
    completed: "any",
  };

  @state()
  tasks = local.get();

  mutate = {
    controls: (fn: (current: Controls) => void) => {
      const next = produce(this.controls, fn);
      this.controls = next;
    },

    tasks: (fn: (current: Tasks) => void) => {
      const next = produce(this.tasks, fn);
      this.tasks = next;
      local.set(this.tasks);
    },
  };

  getTasks() {
    const fn = this.controls.reversed ? ("asc" as const) : ("desc" as const);

    return sort(
      Object.values(this.tasks).filter((item) => {
        if (this.controls.search) {
          const search = this.controls.search.toLowerCase();
          if (!item.title.toLowerCase().includes(search)) return false;
        }

        if (this.controls.completed === "only" && !item.completed) return false;

        if (this.controls.completed === "none" && item.completed) return false;

        return true;
      })
    )[fn]((x) => x.title);
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
            <input type="checkbox"
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
          <select @change=${(event: any) => {
            const target = event.target;
            this.mutate.controls((x) => {
              x.completed = target.value;
            });
          }}>
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
        ${
          this.controls.search &&
          html`<div>Results for "${this.controls.search}"</div>`
        }

        <ul>
          ${this.getTasks().map(({ id }) => {
            const item = this.tasks[id];

            return html`<li>
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
            </li>`;
          })}
        </ul>

        <div>Total Tasks: ${Object.keys(this.tasks).length}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-local": AppLocal;
  }
}
