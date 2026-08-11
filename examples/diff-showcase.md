# Patch Review: Pocket Tasks

This review follows a small task app as it gains priorities, keyboard shortcuts, and a clearer empty state. Each patch is a real unified diff rendered by Hunk inside Tooee's Markdown view.

> Move the cursor with `j` and `k`. Use `h` and `l` to pan a wide patch. Press `t` or `T` to change the theme.

## 1. Give every task a priority

The first patch updates the shared model and keeps the default explicit. Word-level highlighting makes the type and function changes easy to spot.

```diff
diff --git a/src/tasks.ts b/src/tasks.ts
index 83d42c1..a51d9a7 100644
--- a/src/tasks.ts
+++ b/src/tasks.ts
@@ -1,5 +1,8 @@
+export type Priority = "low" | "normal" | "high";
+
 export interface Task {
   id: string;
   title: string;
   done: boolean;
+  priority: Priority;
 }
@@ -7,5 +10,5 @@ export interface Task {
-export function createTask(id: string, title: string): Task {
-  return { id, title, done: false };
+export function createTask(id: string, title: string, priority: Priority = "normal"): Task {
+  return { id, title, done: false, priority };
 }
```

## 2. Add a compact task card

This patch requests the `split` layout. Tooee uses a stacked layout automatically when the terminal is too narrow for two readable columns.

```diff split
diff --git a/src/task-card.tsx b/src/task-card.tsx
new file mode 100644
index 0000000..c78b512
--- /dev/null
+++ b/src/task-card.tsx
@@ -0,0 +1,23 @@
+import type { Task } from "./tasks";
+
+const priorityLabel = {
+  high: "Urgent",
+  low: "Whenever",
+  normal: "Next",
+} as const;
+
+export function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
+  return (
+    <button
+      className={`task-card task-card--${task.priority}`}
+      onClick={onToggle}
+      type="button"
+    >
+      <span aria-hidden="true">{task.done ? "✓" : "○"}</span>
+      <span className="task-card__title">{task.title}</span>
+      <small>{priorityLabel[task.priority]}</small>
+    </button>
+  );
+}
```

## 3. Improve the empty state and shortcuts

The `nolines` option removes line-number columns. The `wrap` option keeps long copy visible instead of clipping it.

```patch nolines wrap
diff --git a/src/app.tsx b/src/app.tsx
index 6d46ee2..31ca37b 100644
--- a/src/app.tsx
+++ b/src/app.tsx
@@ -8,1 +8,13 @@ export function App() {
   const [tasks, setTasks] = useState<Task[]>([]);
+  useEffect(() => {
+    const addTask = (event: KeyboardEvent) => {
+      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
+        setComposerOpen(true);
+      }
+    };
+    window.addEventListener("keydown", addTask);
+    return () => window.removeEventListener("keydown", addTask);
+  }, []);
+
@@ -10,3 +22,3 @@ export function App() {
   if (tasks.length === 0) {
-    return <p>No tasks.</p>;
+    return <EmptyState title="A clear list" hint="Press N to capture the first thing on your mind." />;
   }
```

## Review summary

| Area        | Result                                          |
| ----------- | ----------------------------------------------- |
| Data model  | Priority is typed and defaults to `normal`      |
| Interface   | Task cards expose state without extra chrome    |
| Keyboard    | `n` opens the composer when no modifier is held |
| Empty state | The first action is visible and specific        |

### Ordinary diff-style notes still work

A fence that is not a unified patch falls back to Tooee's syntax-highlighted code renderer:

```diff
- vague empty-state copy
+ a direct prompt for the next action
```

---

_Press `q` when the review is complete._
