// The repo root, so every entry point can run from any directory. Each script that reads or
// writes files by name chdirs here first; from then on its paths are repo-relative:
//   data/    the assets the build reads (committed)
//   build/   what the build writes (only iray.asm is committed)
//   art/     source art; krill/ the loader; lest-c64.d64 at the top
export const ROOT = new URL('..', import.meta.url).pathname;
