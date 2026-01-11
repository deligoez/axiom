import * as crypto from "node:crypto";
import type { AgentType, Learning, LearningScope } from "../types/learning.js";

interface ScopeResult {
	scope: LearningScope;
	content: string;
}

export class LearningExtractor {
	private scopeRegex = /^\[(LOCAL|CROSS-CUTTING|ARCHITECTURAL)\]\s*/i;

	parse(content: string, taskId: string, agentType: AgentType): Learning[] {
		if (!content || !content.trim()) {
			return [];
		}

		const learnings: Learning[] = [];
		const lines = content.split("\n");
		let currentCategory = "general";
		let currentBullet: string | null = null;
		let currentScope: LearningScope = "local";
		const timestamp = new Date();

		for (const line of lines) {
			// Check for heading (category)
			if (line.startsWith("### ")) {
				// Save any pending bullet first
				if (currentBullet) {
					learnings.push(
						this.createLearning(
							currentBullet,
							currentScope,
							currentCategory,
							taskId,
							agentType,
							timestamp,
						),
					);
					currentBullet = null;
				}
				currentCategory = this.detectCategory(line);
				continue;
			}

			// Check for bullet point
			if (line.startsWith("- ")) {
				// Save any pending bullet first
				if (currentBullet) {
					learnings.push(
						this.createLearning(
							currentBullet,
							currentScope,
							currentCategory,
							taskId,
							agentType,
							timestamp,
						),
					);
				}
				// Start new bullet
				const bulletContent = line.slice(2).trim();
				const { scope, content: cleanContent } =
					this.detectScope(bulletContent);
				currentBullet = cleanContent;
				currentScope = scope;
				continue;
			}

			// Check for continuation (indented line)
			if (currentBullet && line.match(/^\s+\S/)) {
				currentBullet += `\n${line.trim()}`;
			}
		}

		// Don't forget the last bullet
		if (currentBullet) {
			learnings.push(
				this.createLearning(
					currentBullet,
					currentScope,
					currentCategory,
					taskId,
					agentType,
					timestamp,
				),
			);
		}

		return learnings;
	}

	detectScope(text: string): ScopeResult {
		const match = this.scopeRegex.exec(text);
		if (!match) {
			return { scope: "local", content: text.trim() };
		}

		const scopeMap: Record<string, LearningScope> = {
			local: "local",
			"cross-cutting": "cross-cutting",
			architectural: "architectural",
		};

		const scope = scopeMap[match[1].toLowerCase()] || "local";
		const content = text.slice(match[0].length).trim();

		return { scope, content };
	}

	detectCategory(headingText: string): string {
		const lower = headingText.toLowerCase();

		if (lower.includes("performance")) return "performance";
		if (lower.includes("test")) return "testing";
		if (lower.includes("debug")) return "debugging";
		if (lower.includes("error") || lower.includes("exception"))
			return "error-handling";
		if (lower.includes("pattern")) return "patterns";

		return "general";
	}

	formatForStorage(learning: Learning): string {
		const scopePrefix = `[${learning.scope.toUpperCase()}]`;
		const timestamp = learning.source.timestamp.toISOString();
		const attribution = `<!-- source: ${learning.source.taskId}, ${learning.source.agentType}, ${timestamp}, category: ${learning.category} -->`;

		return `- ${scopePrefix} ${learning.content}\n  ${attribution}`;
	}

	requiresPlanReview(learnings: Learning[]): boolean {
		return learnings.some(
			(l) => l.scope === "cross-cutting" || l.scope === "architectural",
		);
	}

	requiresAlert(learnings: Learning[]): boolean {
		return learnings.some((l) => l.scope === "architectural");
	}

	private createLearning(
		content: string,
		scope: LearningScope,
		category: string,
		taskId: string,
		agentType: AgentType,
		timestamp: Date,
	): Learning {
		return {
			id: crypto.randomUUID(),
			content,
			scope,
			category,
			source: {
				taskId,
				agentType,
				timestamp,
			},
			suggestPattern: scope !== "local",
		};
	}
}
