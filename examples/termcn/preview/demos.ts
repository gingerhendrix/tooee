/**
 * Which vendored demos belong to a component. The docs page lists its
 * previews in order, and that list wins. Demos the page does not list are
 * matched by file name: `checkbox-group-demo` belongs to `checkbox-group`,
 * not `checkbox`, because the longest matching component name owns a demo.
 */

/** The component that owns a demo file name, or null. */
export const demoOwner = function demoOwner(
  demo: string,
  componentNames: readonly string[]
): string | null {
  let owner: string | null = null;

  for (const name of componentNames) {
    const matches = demo === name || demo.startsWith(`${name}-`);

    if (matches && name.length > (owner?.length ?? 0)) {
      owner = name;
    }
  }

  return owner;
};

/**
 * Ordered demo names for one component.
 *
 * @param name - Component name, for example `spinner`.
 * @param previews - Demo names from the docs page, in page order.
 * @param available - Demo names present in vendor/.
 * @param componentNames - Every component name, for ownership by file name.
 */
export const demosForComponent = function demosForComponent(
  name: string,
  previews: readonly string[],
  available: readonly string[],
  componentNames: readonly string[]
): string[] {
  const present = new Set(available);
  const listed = previews.filter((demo) => present.has(demo));
  const listedSet = new Set(listed);

  const owned = available
    .filter((demo) => !listedSet.has(demo) && demoOwner(demo, componentNames) === name)
    .toSorted();

  return [...listed, ...owned];
};
