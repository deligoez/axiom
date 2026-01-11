import { describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { chorusMachine } from "./chorus.machine.js";

describe("ChorusMachine", () => {
	const defaultInput = {
		config: { projectRoot: "/test" },
	};

	it("initializes in INIT state", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });

		// Act
		actor.start();
		const snapshot = actor.getSnapshot();

		// Assert
		expect(snapshot.value).toMatchObject({ app: "init" });
		actor.stop();
	});

	it("CONFIG_COMPLETE transitions INIT to PLANNING", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();

		// Act
		actor.send({ type: "CONFIG_COMPLETE", config: { projectRoot: "/new" } });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({ app: "planning" });
		expect(actor.getSnapshot().context.config.projectRoot).toBe("/new");
		actor.stop();
	});

	it("PLAN_APPROVED transitions PLANNING to REVIEW", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		actor.send({ type: "CONFIG_COMPLETE", config: defaultInput.config });

		// Act
		actor.send({ type: "PLAN_APPROVED" });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({ app: "review" });
		actor.stop();
	});

	it("REVIEW_PASSED transitions REVIEW to IMPLEMENTATION", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		actor.send({ type: "CONFIG_COMPLETE", config: defaultInput.config });
		actor.send({ type: "PLAN_APPROVED" });

		// Act
		actor.send({ type: "REVIEW_PASSED" });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({ app: "implementation" });
		actor.stop();
	});

	it("TRIGGER_PLANNING transitions back to PLANNING", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		actor.send({ type: "CONFIG_COMPLETE", config: defaultInput.config });
		actor.send({ type: "PLAN_APPROVED" });
		actor.send({ type: "REVIEW_PASSED" });

		// Act
		actor.send({ type: "TRIGGER_PLANNING" });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({ app: "planning" });
		actor.stop();
	});

	it("parallel regions run independently", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();

		// Assert - all parallel regions have initial states
		const value = actor.getSnapshot().value;
		expect(value).toMatchObject({
			app: "init",
			orchestration: "idle",
			mergeQueue: "empty",
			monitoring: "active",
		});
		actor.stop();
	});

	it("PAUSE sets orchestration to paused", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		actor.send({ type: "RESUME" }); // First go to running

		// Act
		actor.send({ type: "PAUSE" });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({
			orchestration: "paused",
		});
		actor.stop();
	});

	it("RESUME sets orchestration to running", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();

		// Act
		actor.send({ type: "RESUME" });

		// Assert
		expect(actor.getSnapshot().value).toMatchObject({
			orchestration: "running",
		});
		actor.stop();
	});

	it("SET_MODE updates context.mode", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		expect(actor.getSnapshot().context.mode).toBe("semi-auto");

		// Act
		actor.send({ type: "SET_MODE", mode: "autopilot" });

		// Assert
		expect(actor.getSnapshot().context.mode).toBe("autopilot");
		actor.stop();
	});

	it("SPAWN_AGENT adds to context.agents", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		expect(actor.getSnapshot().context.agents).toHaveLength(0);

		// Act
		actor.send({ type: "SPAWN_AGENT", taskId: "task-1" });

		// Assert
		expect(actor.getSnapshot().context.agents).toHaveLength(1);
		expect(actor.getSnapshot().context.stats.inProgress).toBe(1);
		actor.stop();
	});

	it("STOP_AGENT removes from context.agents", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();
		actor.send({ type: "SPAWN_AGENT", taskId: "task-1" });
		expect(actor.getSnapshot().context.agents).toHaveLength(1);

		// Act
		actor.send({ type: "STOP_AGENT", agentId: "agent-task-1" });

		// Assert
		expect(actor.getSnapshot().context.agents).toHaveLength(0);
		expect(actor.getSnapshot().context.stats.inProgress).toBe(0);
		actor.stop();
	});

	it("machine context is JSON-serializable", () => {
		// Arrange
		const actor = createActor(chorusMachine, { input: defaultInput });
		actor.start();

		// Act - serialize context (without agents which are actor refs)
		const { agents, ...serializableContext } = actor.getSnapshot().context;
		const serialized = JSON.stringify(serializableContext);
		const deserialized = JSON.parse(serialized);

		// Assert
		expect(deserialized.config.projectRoot).toBe("/test");
		expect(deserialized.mode).toBe("semi-auto");
		expect(deserialized.maxAgents).toBe(3);
		actor.stop();
	});
});
