import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./app.js";
import { useAgentStore } from "./stores/agentStore.js";
import type { Agent } from "./types/agent.js";

const createTestAgent = (overrides: Partial<Agent> = {}): Agent => ({
	id: "test-1",
	name: "test-agent",
	status: "running",
	output: [],
	createdAt: new Date(),
	...overrides,
});

describe("App", () => {
	beforeEach(() => {
		useAgentStore.setState({ agents: [], selectedAgentId: null });
	});
	it("renders welcome message", () => {
		const { lastFrame } = render(<App />);

		expect(lastFrame()).toContain("Chorus");
	});

	it("displays version when showVersion is true", () => {
		const { lastFrame } = render(<App showVersion />);

		expect(lastFrame()).toContain("0.1.0");
	});

	it("displays help when showHelp is true", () => {
		const { lastFrame } = render(<App showHelp />);

		expect(lastFrame()).toContain("Usage");
	});

	it("shows empty state in TUI mode", () => {
		const { lastFrame } = render(<App />);

		expect(lastFrame()).toContain("No agents running");
	});

	it("shows quit hint in TUI mode", () => {
		const { lastFrame } = render(<App />);

		expect(lastFrame()).toContain("q");
	});

	it("calls onExit when q is pressed", async () => {
		const onExit = vi.fn();
		const { stdin } = render(<App onExit={onExit} />);

		stdin.write("q");

		await vi.waitFor(() => {
			expect(onExit).toHaveBeenCalled();
		});
	});

	it("displays agents from store", () => {
		useAgentStore.setState({
			agents: [createTestAgent({ name: "my-agent", output: ["Hello"] })],
			selectedAgentId: null,
		});

		const { lastFrame } = render(<App />);

		expect(lastFrame()).toContain("my-agent");
		expect(lastFrame()).toContain("Hello");
	});

	it("shows agent count in status bar", () => {
		useAgentStore.setState({
			agents: [
				createTestAgent({ id: "a1", name: "agent-1" }),
				createTestAgent({ id: "a2", name: "agent-2" }),
			],
			selectedAgentId: null,
		});

		const { lastFrame } = render(<App />);

		expect(lastFrame()).toContain("2 agents");
	});

	it("spawns demo agent when s is pressed", async () => {
		const { stdin } = render(<App />);

		expect(useAgentStore.getState().agents).toHaveLength(0);

		stdin.write("s");

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(1);
		});

		const agent = useAgentStore.getState().agents[0];
		expect(agent.name).toMatch(/demo/i);
	});

	it("navigates to next agent with j key", async () => {
		useAgentStore.setState({
			agents: [
				createTestAgent({ id: "a1", name: "agent-1" }),
				createTestAgent({ id: "a2", name: "agent-2" }),
			],
			selectedAgentId: "a1",
		});

		const { stdin } = render(<App />);

		stdin.write("j");

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("a2");
		});
	});

	it("navigates to previous agent with k key", async () => {
		useAgentStore.setState({
			agents: [
				createTestAgent({ id: "a1", name: "agent-1" }),
				createTestAgent({ id: "a2", name: "agent-2" }),
			],
			selectedAgentId: "a2",
		});

		const { stdin } = render(<App />);

		stdin.write("k");

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("a1");
		});
	});

	it("auto-selects first agent when spawning with no selection", async () => {
		const { stdin } = render(<App />);

		stdin.write("s");

		await vi.waitFor(() => {
			const state = useAgentStore.getState();
			expect(state.agents).toHaveLength(1);
			expect(state.selectedAgentId).toBe(state.agents[0].id);
		});
	});

	it("wraps to first agent when navigating next from last", async () => {
		useAgentStore.setState({
			agents: [
				createTestAgent({ id: "a1", name: "agent-1" }),
				createTestAgent({ id: "a2", name: "agent-2" }),
			],
			selectedAgentId: "a2", // last agent
		});

		const { stdin } = render(<App />);

		stdin.write("j"); // next

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("a1"); // wrapped to first
		});
	});

	it("wraps to last agent when navigating prev from first", async () => {
		useAgentStore.setState({
			agents: [
				createTestAgent({ id: "a1", name: "agent-1" }),
				createTestAgent({ id: "a2", name: "agent-2" }),
			],
			selectedAgentId: "a1", // first agent
		});

		const { stdin } = render(<App />);

		stdin.write("k"); // prev

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("a2"); // wrapped to last
		});
	});

	it("does nothing when navigating with no agents", () => {
		useAgentStore.setState({
			agents: [],
			selectedAgentId: null,
		});

		const { stdin } = render(<App />);

		stdin.write("j");
		stdin.write("k");

		expect(useAgentStore.getState().selectedAgentId).toBeNull();
	});

	it("stays on same agent when navigating next with single agent", async () => {
		useAgentStore.setState({
			agents: [createTestAgent({ id: "only-one", name: "only-agent" })],
			selectedAgentId: "only-one",
		});

		const { stdin } = render(<App />);

		stdin.write("j"); // next

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("only-one"); // stays on same
		});
	});

	it("stays on same agent when navigating prev with single agent", async () => {
		useAgentStore.setState({
			agents: [createTestAgent({ id: "only-one", name: "only-agent" })],
			selectedAgentId: "only-one",
		});

		const { stdin } = render(<App />);

		stdin.write("k"); // prev

		await vi.waitFor(() => {
			expect(useAgentStore.getState().selectedAgentId).toBe("only-one"); // stays on same
		});
	});
});
