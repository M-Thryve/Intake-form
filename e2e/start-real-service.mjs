import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import process from 'node:process'

process.loadEnvFile(resolve('server/.env'))

const service = process.argv[2]
const env = { ...process.env }
let args
let cwd = resolve('.')

if (service === 'api') {
  env.NODE_ENV = 'production'
  env.DEV_AUTH_BYPASS = 'false'
  env.ALLOWED_ORIGINS = 'http://localhost:8444'
  env.PORT = '3200'
  cwd = resolve('server')
  args = [
    '--require',
    resolve('server/node_modules/tsx/dist/preflight.cjs'),
    '--import',
    pathToFileURL(resolve('server/node_modules/tsx/dist/loader.mjs')).href,
    'src/index.ts',
  ]
} else if (service === 'web') {
  env.VITE_SUPABASE_URL = env.SUPABASE_URL
  env.VITE_SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_ANON_KEY
  env.VITE_API_BASE_URL = ''
  env.PORT = '8444'
  args = [resolve('node_modules/vite/bin/vite.js'), '--host', '0.0.0.0']
} else {
  throw new Error('Expected service argument "api" or "web"')
}

const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' })
child.on('exit', code => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
