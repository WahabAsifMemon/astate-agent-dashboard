import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/* Writes dist/.htaccess (Apache/cPanel) with RewriteBase set to the build's base folder */
function htaccess(base) {
  return {
    name: 'htaccess',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '.htaccess',
        source: readFileSync(new URL('./deploy/htaccess.template', import.meta.url), 'utf8').replaceAll('__BASE__', base),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // Folder the app is served from, e.g. /agent-portal/ on staging (set VITE_BASE in .env.<mode>)
  const base = env.VITE_BASE || '/'
  return {
    plugins: [react(), htaccess(base)],
    base,
  }
})
