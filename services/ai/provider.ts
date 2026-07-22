export interface ProviderOutput {
  text: string
  model: string
  provider: string
  promptTokens?: number
  responseTokens?: number
  latencyMs: number
}

export interface AIProvider {
  readonly name: string
  readonly model: string
  complete(prompt: string): Promise<ProviderOutput>
}

export function createProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? 'gemini'
  if (providerName === 'gemini') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GeminiProvider } = require('./providers/gemini.provider') as {
      GeminiProvider: new () => AIProvider
    }
    return new GeminiProvider()
  }
  throw new Error(
    `Unknown AI_PROVIDER: "${providerName}". Supported values: gemini`
  )
}
