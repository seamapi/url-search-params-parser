export default () => {
  return {
    files: ['**/*.test.ts', '!package/**/*'],
    watchMode: {
      ignoreChanges: ['tmp/**/*'],
    },
    extensions: ['ts'],
    nodeArguments: ['--import=tsx'],
    // Node.js ignores the --import in a worker thread's execArgv, so the tsx
    // hooks are only registered when each test file gets its own process.
    workerThreads: false,
  }
}
