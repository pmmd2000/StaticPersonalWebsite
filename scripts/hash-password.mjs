// Prints an ADMIN_PASSWORD_HASH value for the site (PBKDF2-SHA256, 100k
// iterations: the most Cloudflare Workers' WebCrypto allows).
//
//   npm run hash-password                 # prompts, input hidden
//   <password source> | npm run hash-password --silent
//
// Then: npx wrangler secret put ADMIN_PASSWORD_HASH  (paste the printed value)
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'

const ITERATIONS = 100_000

async function readPassword() {
    if (!process.stdin.isTTY) {
        let data = ''
        for await (const chunk of process.stdin) data += chunk
        return data.replace(/\r?\n$/, '')
    }
    const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: true })
    rl._writeToOutput = () => {} // hide what is typed
    process.stderr.write('Password: ')
    const answer = await new Promise((resolve) => rl.question('', resolve))
    rl.close()
    process.stderr.write('\n')
    return answer
}

const password = await readPassword()
if (password.length < 12) {
    console.error('Use at least 12 characters.')
    process.exit(1)
}
const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
console.log(`pbkdf2-sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`)
