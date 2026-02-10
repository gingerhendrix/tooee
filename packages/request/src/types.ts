export interface RequestChunk {
  delta: string
}

export interface RequestContentProvider {
  submit(input: string): AsyncIterable<RequestChunk>
}
