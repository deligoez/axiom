import * as fs from "node:fs";

const DRAFT_EMOJI = "📋";
const TASKED_EMOJI = "✅";

export class SpecSectionCollapser {
	/**
	 * Collapse a section by wrapping it in <details> tags.
	 * Changes emoji from 📋 to ✅ and appends (TASKED).
	 */
	collapseSection(specPath: string, heading: string, taskIds: string[]): void {
		// Only collapse sections with the draft emoji
		if (!heading.includes(DRAFT_EMOJI)) {
			return;
		}

		const content = fs.readFileSync(specPath, "utf-8");
		const lines = content.split("\n");

		// Find the section
		const sectionIndex = this.findSectionIndex(lines, heading);
		if (sectionIndex === -1) {
			return;
		}

		// Find the end of the section (next ## heading or end of file)
		const sectionEndIndex = this.findSectionEnd(lines, sectionIndex);

		// Extract section content (excluding the heading line)
		const sectionContent = lines.slice(sectionIndex + 1, sectionEndIndex);

		// Create new heading with emoji change and (TASKED)
		const newHeading = `${heading.replace(DRAFT_EMOJI, TASKED_EMOJI)} (TASKED)`;

		// Create collapsed section
		const taskIdList = taskIds.join(", ");
		const collapsedSection = [
			`## ${newHeading}`,
			"",
			"<details>",
			`<summary>→ ${taskIdList} (click to expand)</summary>`,
			"",
			...sectionContent,
			"</details>",
		];

		// Replace the section
		const newLines = [
			...lines.slice(0, sectionIndex),
			...collapsedSection,
			...lines.slice(sectionEndIndex),
		];

		fs.writeFileSync(specPath, newLines.join("\n"));
	}

	/**
	 * Expand a collapsed section by removing the <details> wrapper.
	 */
	expandSection(specPath: string, heading: string): void {
		const content = fs.readFileSync(specPath, "utf-8");
		const lines = content.split("\n");

		// Find the section
		const sectionIndex = this.findSectionIndex(lines, heading);
		if (sectionIndex === -1) {
			return;
		}

		// Find the <details> and </details> tags
		let detailsStart = -1;
		let summaryEnd = -1;
		let detailsEnd = -1;

		for (let i = sectionIndex + 1; i < lines.length; i++) {
			const line = lines[i].trim();

			// Stop if we hit another ## heading
			if (line.startsWith("## ")) {
				break;
			}

			if (line === "<details>") {
				detailsStart = i;
			} else if (line.startsWith("<summary>") && line.endsWith("</summary>")) {
				summaryEnd = i;
			} else if (line === "</details>") {
				detailsEnd = i;
				break;
			}
		}

		if (detailsStart === -1 || detailsEnd === -1) {
			return;
		}

		// Extract content between summary and </details>
		const contentStart = summaryEnd !== -1 ? summaryEnd + 1 : detailsStart + 1;
		const innerContent = lines.slice(contentStart, detailsEnd);

		// Remove empty lines at start of inner content
		while (innerContent.length > 0 && innerContent[0].trim() === "") {
			innerContent.shift();
		}

		// Build new section without details wrapper
		const newLines = [
			...lines.slice(0, detailsStart),
			...innerContent,
			...lines.slice(detailsEnd + 1),
		];

		fs.writeFileSync(specPath, newLines.join("\n"));
	}

	/**
	 * Check if a section is collapsed (has <details> wrapper).
	 */
	isCollapsed(specPath: string, heading: string): boolean {
		const content = fs.readFileSync(specPath, "utf-8");
		const lines = content.split("\n");

		// Find the section
		const sectionIndex = this.findSectionIndex(lines, heading);
		if (sectionIndex === -1) {
			return false;
		}

		// Look for <details> tag in the section
		for (let i = sectionIndex + 1; i < lines.length; i++) {
			const line = lines[i].trim();

			// Stop if we hit another ## heading
			if (line.startsWith("## ")) {
				return false;
			}

			if (line === "<details>") {
				return true;
			}
		}

		return false;
	}

	/**
	 * Find the index of a section heading in the lines array.
	 */
	private findSectionIndex(lines: string[], heading: string): number {
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === `## ${heading}`) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Find the end of a section (next ## heading or end of file).
	 */
	private findSectionEnd(lines: string[], startIndex: number): number {
		for (let i = startIndex + 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line.startsWith("## ")) {
				return i;
			}
		}
		return lines.length;
	}
}
