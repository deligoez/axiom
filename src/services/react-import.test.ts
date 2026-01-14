/**
 * Test to ensure tsx entry point files have proper React runtime imports.
 *
 * When using JSX with tsx runner in development, React must be available at runtime
 * in entry point files (index.tsx, App.tsx).
 *
 * Biome's organizeImports can convert `import React` to `import type React`
 * which breaks JSX at runtime for tsx.
 *
 * Solution: Use biome-ignore comment to prevent type conversion.
 *
 * This test prevents regression of: "React is not defined" error
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Entry point files that need runtime React import */
const ENTRY_FILES = ["src/index.tsx", "src/App.tsx"];

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
	it.each(ENTRY_FILES)("%s should have runtime React import", (file) => {
		// Arrange
		const fullPath = join(process.cwd(), file);
		const content = readFileSync(fullPath, "utf-8");

		// Act & Assert - Check for runtime React import
		expect(
			hasRuntimeReactImport(content),
			`${file} must have runtime React import (not type-only). Add biome-ignore comment if needed.`,
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
