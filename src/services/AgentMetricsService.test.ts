import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type AgentMetrics,
	createDefaultMetrics,
} from "../types/agent-metrics.js";
import { AgentMetricsService } from "./AgentMetricsService.js";

describe("AgentMetricsService", () => {
	let projectDir: string;
	let service: AgentMetricsService;

	beforeEach(() => {
		projectDir = join(process.cwd(), "test-fixtures", `metrics-${Date.now()}`);
		mkdirSync(projectDir, { recursive: true });
		service = new AgentMetricsService(projectDir);
	});

	afterEach(() => {
		rmSync(projectDir, { recursive: true, force: true });
	});

	describe("load()", () => {
		it("returns default metrics if file does not exist", () => {
			// Arrange
			const persona = "chip";

			// Act
			const metrics = service.load(persona);

			// Assert
			expect(metrics.persona).toBe(persona);
			expect(metrics.tasks.completed).toBe(0);
			expect(metrics.tasks.failed).toBe(0);
			expect(metrics.tasks.successRate).toBe(0);
		});

		it("reads existing metrics from file", () => {
			// Arrange
			const persona = "sage";
			const metricsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"metrics.json",
			);
			const existingMetrics: AgentMetrics = {
				...createDefaultMetrics(persona),
				tasks: { completed: 10, failed: 2, successRate: 0.83 },
			};
			mkdirSync(join(projectDir, ".chorus", "agents", persona), {
				recursive: true,
			});
			writeFileSync(metricsPath, JSON.stringify(existingMetrics));

			// Act
			const metrics = service.load(persona);

			// Assert
			expect(metrics.tasks.completed).toBe(10);
			expect(metrics.tasks.failed).toBe(2);
			expect(metrics.tasks.successRate).toBe(0.83);
		});
	});

	describe("recordTaskComplete()", () => {
		it("increments completed count and updates stats", () => {
			// Arrange
			const persona = "chip";

			// Act
			service.recordTaskComplete(persona, 120000, 3);
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			expect(metrics.tasks.completed).toBe(1);
			expect(metrics.tasks.successRate).toBe(1);
			expect(metrics.iterations.total).toBe(3);
			expect(metrics.timing.totalRuntimeMs).toBe(120000);
		});

		it("calculates averages correctly", () => {
			// Arrange
			const persona = "chip";

			// Act
			service.recordTaskComplete(persona, 100000, 2);
			service.recordTaskComplete(persona, 200000, 4);
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			expect(metrics.tasks.completed).toBe(2);
			expect(metrics.iterations.total).toBe(6);
			expect(metrics.iterations.avgPerTask).toBe(3);
			expect(metrics.iterations.maxPerTask).toBe(4);
			expect(metrics.timing.avgDurationMs).toBe(150000);
			expect(metrics.timing.totalRuntimeMs).toBe(300000);
		});
	});

	describe("recordTaskFail()", () => {
		it("increments error count and failed count", () => {
			// Arrange
			const persona = "patch";

			// Act
			service.recordTaskFail(persona, "timeout");
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			expect(metrics.tasks.failed).toBe(1);
			expect(metrics.errors.timeout).toBe(1);
		});

		it("updates success rate correctly", () => {
			// Arrange
			const persona = "chip";
			service.recordTaskComplete(persona, 100000, 2);
			service.recordTaskComplete(persona, 100000, 2);

			// Act
			service.recordTaskFail(persona, "crash");
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			expect(metrics.tasks.completed).toBe(2);
			expect(metrics.tasks.failed).toBe(1);
			expect(metrics.tasks.successRate).toBeCloseTo(0.667, 2);
		});
	});

	describe("recordTokens()", () => {
		it("accumulates token usage", () => {
			// Arrange
			const persona = "sage";

			// Act
			service.recordTokens(persona, 1000, 500);
			service.recordTokens(persona, 2000, 800);
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			expect(metrics.tokens.input).toBe(3000);
			expect(metrics.tokens.output).toBe(1300);
		});

		it("calculates estimated cost", () => {
			// Arrange
			const persona = "chip";

			// Act - Claude pricing: $3/1M input, $15/1M output
			service.recordTokens(persona, 100000, 10000);
			service.flush(persona);

			// Assert
			const metrics = service.load(persona);
			// Cost = (100000 * 3 / 1000000) + (10000 * 15 / 1000000) = 0.30 + 0.15 = 0.45
			expect(metrics.tokens.estimatedCost).toBeCloseTo(0.45, 2);
		});
	});

	describe("flush()", () => {
		it("persists metrics to disk", () => {
			// Arrange
			const persona = "chip";
			service.recordTaskComplete(persona, 60000, 2);

			// Act
			service.flush(persona);

			// Assert
			const metricsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"metrics.json",
			);
			const content = readFileSync(metricsPath, "utf-8");
			const metrics = JSON.parse(content);
			expect(metrics.tasks.completed).toBe(1);
		});

		it("creates directory if not exists", () => {
			// Arrange
			const persona = "scout";
			service.recordTaskComplete(persona, 30000, 1);

			// Act
			service.flush(persona);

			// Assert
			const metricsPath = join(
				projectDir,
				".chorus",
				"agents",
				persona,
				"metrics.json",
			);
			const content = readFileSync(metricsPath, "utf-8");
			expect(content.length).toBeGreaterThan(0);
		});
	});
});
