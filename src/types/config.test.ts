import { describe, expect, it } from "vitest";
import type {
	AgentTypeConfig,
	ChorusConfig,
	QualityCommand,
} from "./config.js";
import { getDefaultConfig } from "./config.js";

describe("Config types", () => {
	it("AgentTypeConfig accepts object with command and args only", () => {
		// Arrange & Act
		const config: AgentTypeConfig = {
			command: "claude",
			args: ["--dangerously-skip-permissions"],
		};

		// Assert
		expect(config.command).toBe("claude");
		expect(config.args).toEqual(["--dangerously-skip-permissions"]);
		expect(config.model).toBeUndefined();
	});

	it("AgentTypeConfig accepts object with all fields including model", () => {
		// Arrange & Act
		const config: AgentTypeConfig = {
			command: "claude",
			args: ["--model", "opus"],
			model: "opus",
			allowModelOverride: true,
		};

		// Assert
		expect(config.command).toBe("claude");
		expect(config.model).toBe("opus");
		expect(config.allowModelOverride).toBe(true);
	});

	it("QualityCommand interface accepts valid quality command object", () => {
		// Arrange & Act
		const cmd: QualityCommand = {
			name: "test",
			command: "npm test",
			required: true,
			order: 1,
		};

		// Assert
		expect(cmd.name).toBe("test");
		expect(cmd.command).toBe("npm test");
		expect(cmd.required).toBe(true);
		expect(cmd.order).toBe(1);
	});

	it("ChorusConfig requires all top-level sections", () => {
		// Arrange & Act
		const config: ChorusConfig = {
			version: "3.1",
			mode: "semi-auto",
			project: { taskIdPrefix: "ch-" },
			agents: {
				default: "claude",
				maxParallel: 3,
				timeoutMinutes: 30,
				available: {},
			},
			qualityCommands: [],
			completion: {
				signal: "<chorus>COMPLETE</chorus>",
				requireTests: true,
				maxIterations: 50,
				taskTimeout: 30,
			},
			merge: {
				autoResolve: true,
				agentResolve: true,
				requireApproval: false,
			},
			tui: { agentGrid: "auto" },
			checkpoints: {
				beforeAutopilot: true,
				beforeMerge: true,
				periodic: 5,
			},
			planReview: {
				enabled: true,
				maxIterations: 5,
				triggerOn: [],
				autoApply: "none",
				requireApproval: [],
			},
			review: {
				defaultMode: "batch",
				autoApprove: {
					enabled: true,
					maxIterations: 3,
					requireQualityPass: true,
				},
				labelRules: [],
			},
		};

		// Assert
		expect(config.version).toBe("3.1");
		expect(config.project).toBeDefined();
		expect(config.agents).toBeDefined();
		expect(config.completion).toBeDefined();
		expect(config.merge).toBeDefined();
		expect(config.tui).toBeDefined();
		expect(config.checkpoints).toBeDefined();
		expect(config.planReview).toBeDefined();
		expect(config.review).toBeDefined();
	});

	it("getDefaultConfig() returns valid ChorusConfig with expected defaults", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.version).toBe("3.1");
		expect(config.mode).toBe("semi-auto");
	});

	it("getDefaultConfig() returns Claude-only agent configuration", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.agents.default).toBe("claude");
		expect(config.agents.available.claude).toBeDefined();
		expect(config.agents.available.claude?.command).toBe("claude");
		expect(config.agents.available.codex).toBeUndefined();
		expect(config.agents.available.opencode).toBeUndefined();
	});

	it("getDefaultConfig() returns qualityCommands array with npm test as required", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.qualityCommands).toHaveLength(1);
		expect(config.qualityCommands[0].name).toBe("test");
		expect(config.qualityCommands[0].command).toBe("npm test");
		expect(config.qualityCommands[0].required).toBe(true);
	});

	it("getDefaultConfig() returns project.taskIdPrefix as 'ch-'", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.project.taskIdPrefix).toBe("ch-");
	});

	it("getDefaultConfig() returns agents.timeoutMinutes as 30", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.agents.timeoutMinutes).toBe(30);
	});

	it("getDefaultConfig() returns checkpoints with all fields", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.checkpoints.beforeAutopilot).toBe(true);
		expect(config.checkpoints.beforeMerge).toBe(true);
		expect(config.checkpoints.periodic).toBe(5);
	});

	it("getDefaultConfig() returns planReview with all fields", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.planReview.enabled).toBe(true);
		expect(config.planReview.maxIterations).toBe(5);
		expect(config.planReview.triggerOn).toContain("cross_cutting");
		expect(config.planReview.triggerOn).toContain("architectural");
		expect(config.planReview.autoApply).toBe("minor");
		expect(config.planReview.requireApproval).toContain("redundant");
		expect(config.planReview.requireApproval).toContain("dependency_change");
	});

	it("getDefaultConfig() returns review config with batch mode as default", () => {
		// Arrange & Act
		const config = getDefaultConfig();

		// Assert
		expect(config.review).toBeDefined();
		expect(config.review.defaultMode).toBe("batch");
		expect(config.review.autoApprove.enabled).toBe(true);
		expect(config.review.autoApprove.maxIterations).toBe(3);
		expect(config.review.autoApprove.requireQualityPass).toBe(true);
		expect(config.review.labelRules).toEqual([]);
	});

	it("getDefaultConfig() sets createdAt and updatedAt to current timestamp", () => {
		// Arrange
		const before = new Date().toISOString();

		// Act
		const config = getDefaultConfig();

		// Assert
		const after = new Date().toISOString();
		expect(config.createdAt).toBeDefined();
		expect(config.updatedAt).toBeDefined();
		expect(config.createdAt).toBe(config.updatedAt);
		// Timestamps should be between before and after
		expect(config.createdAt! >= before).toBe(true);
		expect(config.createdAt! <= after).toBe(true);
	});
});
