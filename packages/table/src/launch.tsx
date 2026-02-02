import { launchCli } from "@tooee/shell"
import { TableApp } from "./TableApp.tsx"
import type { TableContentProvider } from "./types.ts"

export interface TableLaunchOptions {
  contentProvider: TableContentProvider
}

export async function launch(options: TableLaunchOptions): Promise<void> {
  await launchCli(
    <TableApp contentProvider={options.contentProvider} />,
  )
}
