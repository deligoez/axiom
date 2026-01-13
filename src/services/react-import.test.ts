/**
 * Test to ensure tsx entry point files have proper React runtime imports.
 *
 * When using JSX with tsx runner in development, React must be available at runtime
 * in entry point files (index.tsx, App.tsx). Other files are bundled/transpiled
 * with the correct JSX transform.
 *
 * Biome's organizeImports can convert `import React` to `import type React`
 * which breaks JSX at runtime for tsx.
 *
 * Solution: Use namespace import `import * as React from "react"` which
 * Biome won't convert to type-only.
 *
 * This test prevents regression of: "React is not defined" error
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Bootstrap file that makes React globally available for tsx runtime.
 * This is the primary protection against "React is not defined" errors.
 */
const BOOTSTRAP_FILE = "src/bootstrap.ts";

/**
 * Check if file has React runtime import (not type-only).
 * Accepts both default import and namespace import patterns.
 */
function hasRuntimeReactImport(content: string): boolean {
	// Valid patterns:
	// import React from "react"
	// import React, { useState } from "react"
	// import * as React from "react"
	// // biome-ignore ... import React from "react" (with biome-ignore)

	// Invalid patterns (type-only):
	// import type React from "react"

	const runtimeImportPattern =
		/import\s+(?!type\s+)(?:React|\*\s+as\s+React)[\s,]/;
	return runtimeImportPattern.test(content);
}

describe("React Import Validation (tsx runner)", () => {
	it("bootstrap.ts should have React import and make it globally available", () => {
		// Arrange
		const fullPath = join(process.cwd(), BOOTSTRAP_FILE);
		const content = readFileSync(fullPath, "utf-8");

		// Act & Assert - Check for runtime React import
		expect(
			hasRuntimeReactImport(content),
			`${BOOTSTRAP_FILE} must have runtime React import (not type-only)`,
		).toBe(true);

		// Also verify it sets React globally
		expect(
			content.includes("globalThis"),
			`${BOOTSTRAP_FILE} must set React on globalThis for tsx runtime`,
		).toBe(true);
	});

	it("helper: hasRuntimeReactImport detects valid patterns", () => {
		// Arrange & Act & Assert

		// Valid runtime imports
		expect(hasRuntimeReactImport('import React from "react"')).toBe(true);
		expect(
			hasRuntimeReactImport('import React, { useState } from "react"'),
		).toBe(true);
		expect(hasRuntimeReactImport('import * as React from "react"')).toBe(true);

		// Type-only imports (should fail)
		expect(hasRuntimeReactImport('import type React from "react"')).toBe(false);
		expect(hasRuntimeReactImport('import { useState } from "react"')).toBe(
			false,
		);
	});
});
