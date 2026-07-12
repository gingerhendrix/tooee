export interface ChooseItem {
  text: string;
  value?: string;
  icon?: string;
  description?: string;
}

export interface ChooseContentProvider {
  load(): Promise<ChooseItem[]> | ChooseItem[];
}

/** Any item source accepted by the shared chooser core. */
export type ChooseSource =
  | ChooseItem[]
  | ChooseContentProvider
  | (() => ChooseItem[] | Promise<ChooseItem[]>);

export interface ChooseResult {
  items: ChooseItem[];
}

export interface ChooseOptions {
  multi?: boolean;
  title?: string;
  prompt?: string;
  placeholder?: string;
  emptyMessage?: string;
}
