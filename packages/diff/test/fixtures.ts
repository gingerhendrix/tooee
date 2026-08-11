/** Two-file git patch with a multi-hunk file, used across the diff tests. */
export const MULTI_FILE_PATCH = `diff --git a/src/a.ts b/src/a.ts
index 1111111..2222222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 22;
+const c = 3;
 export { a };
@@ -20,3 +21,3 @@ function tail() {
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 4;
diff --git a/docs/notes.md b/docs/notes.md
index 3333333..4444444 100644
--- a/docs/notes.md
+++ b/docs/notes.md
@@ -1,2 +1,2 @@
-old note
+new note
 trailing
`;

/** A rename plus a binary file: the shapes Hunk renders without hunks. */
export const RENAME_AND_BINARY_PATCH = `diff --git a/old.txt b/new.txt
similarity index 90%
rename from old.txt
rename to new.txt
--- a/old.txt
+++ b/new.txt
@@ -1 +1 @@
-hello
+world
diff --git a/img.png b/img.png
Binary files a/img.png and b/img.png differ
`;

/** A bare unified diff, as produced by `diff -u` without git headers. */
export const BARE_UNIFIED_PATCH = `--- a/one.txt
+++ b/one.txt
@@ -1,2 +1,2 @@
-first
+FIRST
 second
--- a/two.txt
+++ b/two.txt
@@ -1 +1 @@
-alpha
+beta
`;
