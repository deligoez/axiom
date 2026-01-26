import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SpecSectionCollapser } from "./SpecSectionCollapser.js";

describe("SpecSectionCollapser", () => {
	let tempDir: string;
	let specPath: string;
	let collapser: SpecSectionCollapser;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-collapser-test-"));
		specPath = path.join(tempDir, "spec.md");
		collapser = new SpecSectionCollapser();
	});

	afterEach(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	describe("collapseSection()", () => {
		it("wraps section in <details> tags", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

This is the overview content.
More content here.

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "📋 1. Overview", [
				"ch-001",
				"ch-002",
			]);

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).toContain("<details>");
			expect(result).toContain("</details>");
		});

		it("preserves original content inside collapsed section", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

This is the overview content.
More content here.

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "📋 1. Overview", ["ch-001"]);

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).toContain("This is the overview content.");
			expect(result).toContain("More content here.");
		});

		it("adds task IDs to summary", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

Overview content.

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "📋 1. Overview", [
				"ch-001",
				"ch-002",
			]);

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).toContain("<summary>");
			expect(result).toContain("ch-001, ch-002");
			expect(result).toContain("(click to expand)");
		});

		it("changes emoji from 📋 to ✅ and appends (TASKED)", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

Overview content.

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "📋 1. Overview", ["ch-001"]);

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).toContain("## ✅ 1. Overview (TASKED)");
			expect(result).not.toContain("## 📋 1. Overview");
		});

		it("does not modify draft sections (no 📋 emoji)", () => {
			// Arrange - section without emoji should not be modified
			const content = `# My Spec

## Draft Section

Draft content that should not be touched.

## 📋 2. Ready Section

Ready content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "Draft Section", ["ch-001"]);

			// Assert - should not collapse sections without 📋 emoji
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).not.toContain("## ✅ Draft Section");
			expect(result).toContain("## Draft Section");
		});

		it("handles nested content correctly", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

### Nested Heading

Nested content.

- List item 1
- List item 2

\`\`\`typescript
const code = "example";
\`\`\`

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.collapseSection(specPath, "📋 1. Overview", ["ch-001"]);

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).toContain("### Nested Heading");
			expect(result).toContain("- List item 1");
			expect(result).toContain('const code = "example"');
		});
	});

	describe("expandSection()", () => {
		it("removes <details> wrapper", () => {
			// Arrange - create a collapsed section
			const content = `# My Spec

## ✅ 1. Overview (TASKED)

<details>
<summary>→ ch-001, ch-002 (click to expand)</summary>

Original content.

</details>

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			collapser.expandSection(specPath, "✅ 1. Overview (TASKED)");

			// Assert
			const result = fs.readFileSync(specPath, "utf-8");
			expect(result).not.toContain("<details>");
			expect(result).not.toContain("</details>");
			expect(result).not.toContain("<summary>");
			expect(result).toContain("Original content.");
		});
	});

	describe("isCollapsed()", () => {
		it("returns true if section is collapsed", () => {
			// Arrange
			const content = `# My Spec

## ✅ 1. Overview (TASKED)

<details>
<summary>→ ch-001 (click to expand)</summary>

Content.

</details>

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			const result = collapser.isCollapsed(specPath, "✅ 1. Overview (TASKED)");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false if section is not collapsed", () => {
			// Arrange
			const content = `# My Spec

## 📋 1. Overview

Not collapsed content.

## 📋 2. Requirements

Requirements content.
`;
			fs.writeFileSync(specPath, content);

			// Act
			const result = collapser.isCollapsed(specPath, "📋 1. Overview");

			// Assert
			expect(result).toBe(false);
		});
	});
});
