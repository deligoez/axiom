/**
 * Bootstrap file for tsx development runtime.
 *
 * tsx doesn't properly handle React JSX transform in all cases,
 * so we need to ensure React is globally available before running the app.
 *
 * Usage: npx tsx src/bootstrap.ts [args]
 */

// Make React available globally for JSX transform
import * as React from "react";

(globalThis as unknown as { React: typeof React }).React = React;

// Run the actual app with args
import { run } from "./index.js";

run(process.argv.slice(2));
