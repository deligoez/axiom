/**
 * Test to ensure all tsx files have proper React runtime imports.
 *
 * When using JSX with tsx runner in development, React must be available at runtime
 * in ALL .tsx files that use JSX.
 *
 * tsx doesn't respect tsconfig.json "jsx": "react-jsx" setting and uses classic
 * JSX transform that requires React in scope.
 *
 * Solution: biome.json override disables noUnusedImports and useImportType for tsx files.
 *
 * This test prevents regression of: "React is not defined" error
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Recursively find all tsx files (excluding test files)
 */
function findTsxFiles(dir: string): string[] {
	const files: string[] = [];
	const entries = readdirSync(dir);

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory() && entry !== "node_modules" && entry !== "dist") {
			files.push(...findTsxFiles(fullPath));
		} else if (
			entry.endsWith(".tsx") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".e2e.test.tsx")
		) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Check if file uses JSX (has return with JSX)
 */
function usesJsx(content: string): boolean {
	return /return\s*\(/.test(content) || /return\s*</.test(content);
}

/**
 * Check if file has React runtime import (not type-only).
 */
function hasRuntimeReactImport(content: string): boolean {
	// Valid patterns:
	// import React from "react"
	// import React, { useState } from "react"
	// import * as React from "react"

	// Invalid patterns (type-only):
	// import type React from "react"

	const runtimeImportPattern =
		/import\s+(?!type\s+)(?:React|\*\s+as\s+React)[\s,]/;
	return runtimeImportPattern.test(content);
}

describe("React Import Validation (tsx runner)", () => {
	it("all tsx files with JSX should have runtime React import", () => {
		// Arrange
		const srcDir = join(process.cwd(), "src");
		const tsxFiles = findTsxFiles(srcDir);

		// Act & Assert
		const missingReact: string[] = [];

		for (const file of tsxFiles) {
			const content = readFileSync(file, "utf-8");
			if (usesJsx(content) && !hasRuntimeReactImport(content)) {
				const relativePath = file.replace(process.cwd() + "/", "");
				missingReact.push(relativePath);
			}
		}

		expect(
			missingReact,
			`These files use JSX but are missing React runtime import:\n${missingReact.join("\n")}`,
		).toHaveLength(0);
	});

	it("helper: hasRuntimeReactImport detects valid patterns", () => {
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
