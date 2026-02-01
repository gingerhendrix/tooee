export interface ChooseItem {
  text: string
  value?: string
  icon?: string
  description?: string
}

export interface ChooseContentProvider {
  load(): Promise<ChooseItem[]> | ChooseItem[]
}

export interface ChooseResult {
  items: ChooseItem[]
}

export interface ChooseOptions {
  multi?: boolean
  prompt?: string
  placeholder?: string
}
