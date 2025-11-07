import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { produce } from "immer";
import { type Task, createTask } from "../entities/tasks";
import { createData, type Contents } from "../services/data";

type Tasks = Record<string, Task>;

type Controls = {
  search: string;
  completed: "any" | "none" | "only";
};

@customElement("app-element")
export class MyElement extends LitElement {
  @state()
  controls: Controls = {
    search: "",
    completed: "any",
  };

  @state()
  tasks: Tasks = {};
  data = createData();

  mutate = {
    controls: (fn: (current: Controls) => void) => {
      const next = produce(this.controls, fn);
      this.controls = next;
    },

    tasks: (fn: (current: Contents) => void) => {
      this.data.mutate(fn);
    },
  };

  async connectedCallback() {
    super.connectedCallback();

    this.data.subscribe((x) => {
      this.tasks = x;
    });
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

        <h2>Tasks</h2>
        ${
          this.controls.search &&
          html`<div>Results for "${this.controls.search}"</div>`
        }

        <ul>
          ${Object.keys(this.tasks)
            .filter((id) => {
              const item = this.tasks[id];

              if (this.controls.search) {
                const search = this.controls.search.toLowerCase();
                if (!item.title.toLowerCase().includes(search)) return false;
              }

              if (this.controls.completed === "only" && !item.completed)
                return false;

              if (this.controls.completed === "none" && item.completed)
                return false;

              return true;
            })
            .map((id) => {
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

        <button @click=${this.data.toFile}>💾 Export Data</button>
        <input type="file" @change=${(event: any) => {
          const file = event.target.files?.[0];
          if (!file) return;
          this.data.fromFile(file);
        }} />
        <div>Total Tasks: ${Object.keys(this.tasks).length}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "app-element": MyElement;
  }
}
