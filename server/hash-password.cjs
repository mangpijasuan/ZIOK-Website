const { hashPassword } = require('./auth.cjs');
// Read a password from stdin, never from a command-line argument.
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; if (input.length > 300) process.exit(1); });
process.stdin.on('end', async () => {
  try { console.log(await hashPassword(input.replace(/\r?\n$/, ''))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
});
