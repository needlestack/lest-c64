// vicerun.mjs CAP_SECONDS [x64sc args...] -- run VICE until it exits by itself (-limitcycles,
// -exitscreenshot), or kill it at the cap. Either way its whole process group is cleaned up, and so it
// is on Ctrl-C (tools/vice.mjs). For shell scripts, which used to run x64sc in the foreground and
// `pkill -f x64sc` afterwards -- closing any VICE the user had open, and leaking the real emulator
// whenever the wrapper alone was killed. The standard drive flags and a private config are added.
import { runToExit, LAUNCH_FLAGS } from './vice.mjs';
const [cap, ...args] = process.argv.slice(2);
if (!(+cap > 0)) { console.error('usage: vicerun.mjs CAP_SECONDS [x64sc args...]'); process.exit(2); }
const finished = await runToExit([...LAUNCH_FLAGS, ...args], +cap * 1000);
if (!finished) console.error(`vicerun: killed at the ${cap}s cap`);
process.exit(finished ? 0 : 3);
