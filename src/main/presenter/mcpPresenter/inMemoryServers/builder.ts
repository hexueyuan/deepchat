import { BuiltinKnowledgeServer } from './builtinKnowledgeServer'
import { BuiltinKnowledgeConfig } from '@shared/presenter'

export function getInMemoryServer(
  serverName: string,
  _args: string[],
  env?: Record<string, unknown>
) {
  switch (serverName) {
    case 'builtinKnowledge':
      return new BuiltinKnowledgeServer(
        env as {
          configs: BuiltinKnowledgeConfig[]
        }
      )
    default:
      throw new Error(`Unknown in-memory server: ${serverName}`)
  }
}
