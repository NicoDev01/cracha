export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

export interface GeneratedImage {
  base64: string
  uint8Array?: Uint8Array
  mediaType: string
}

export interface UiMessage {
  role: 'system' | 'user' | 'assistant'
}

export interface ToolUiPart {
  type: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input: unknown
  errorText?: string
}
