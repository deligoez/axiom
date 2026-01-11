import { Text } from "ink";
import { render } from "ink-testing-library";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentStore } from "../stores/agentStore.js";
import {
	type UseAgentManagerReturn,
	useAgentManager,
} from "./useAgentManager.js";

// Mock execa
vi.mock("execa", () => {
	const EventEmitter = require("node:events");
	return {
		execa: vi.fn(() => {
			const proc = new EventEmitter();
			proc.stdout = new EventEmitter();
			proc.stderr = new EventEmitter();
			proc.kill = vi.fn();
			proc.killed = false;
			proc.pid = 12345;
			proc.catch = vi.fn().mockResolvedValue(undefined);
			return proc;
		}),
	};
});

// Test component that uses the hook and exposes its API
function TestComponent({
	onReady,
	autoSpawn,
	autoKill,
	autoKillAll,
}: {
	onReady?: (api: UseAgentManagerReturn) => void;
	autoSpawn?: { name: string; command: string; args?: string[] };
	autoKill?: string;
	autoKillAll?: boolean;
}) {
	const api = useAgentManager();
	const agents = useAgentStore((state) => state.agents);
	const [spawned, setSpawned] = useState(false);

	useEffect(() => {
		onReady?.(api);
	}, [api, onReady]);

	useEffect(() => {
		if (autoSpawn && !spawned) {
			setSpawned(true);
			api.spawn(autoSpawn);
		}
	}, [autoSpawn, api, spawned]);

	useEffect(() => {
		if (autoKill) {
			api.kill(autoKill);
		}
	}, [autoKill, api]);

	useEffect(() => {
		if (autoKillAll) {
			api.killAll();
		}
	}, [autoKillAll, api]);

	return <Text>Agents: {agents.length}</Text>;
}

describe("useAgentManager", () => {
	beforeEach(() => {
		useAgentStore.setState({
			agents: [],
			selectedAgentId: null,
		});
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should return spawn and kill functions", () => {
		let capturedApi: UseAgentManagerReturn | null = null;

		render(
			<TestComponent
				onReady={(api) => {
					capturedApi = api;
				}}
			/>,
		);

		expect(capturedApi).not.toBeNull();
		const api = capturedApi!;
		expect(api.spawn).toBeDefined();
		expect(api.kill).toBeDefined();
		expect(api.killAll).toBeDefined();
	});

	it("should add agent to store when spawned", async () => {
		render(
			<TestComponent
				autoSpawn={{ name: "test-agent", command: "echo", args: ["hello"] }}
			/>,
		);

		// Wait for spawn to complete
		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents).toHaveLength(1);
		});

		const agents = useAgentStore.getState().agents;
		expect(agents[0].name).toBe("test-agent");
		expect(agents[0].status).toBe("running");
	});

	it("should update store when agent outputs", async () => {
		const { execa } = await import("execa");
		const mockExeca = vi.mocked(execa);
		let mockProc: any;

		mockExeca.mockImplementation(() => {
			const EventEmitter = require("node:events");
			mockProc = new EventEmitter();
			mockProc.stdout = new EventEmitter();
			mockProc.stderr = new EventEmitter();
			mockProc.kill = vi.fn();
			mockProc.killed = false;
			mockProc.pid = 12345;
			mockProc.catch = vi.fn().mockResolvedValue(undefined);
			return mockProc as any;
		});

		render(
			<TestComponent
				autoSpawn={{ name: "output-agent", command: "echo", args: ["test"] }}
			/>,
		);

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(1);
		});

		// Simulate output from the process
		mockProc.stdout.emit("data", Buffer.from("Hello World\n"));

		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents[0].output).toContain("Hello World");
		});
	});

	it("should update status when agent exits", async () => {
		const { execa } = await import("execa");
		const mockExeca = vi.mocked(execa);
		let mockProc: any;

		mockExeca.mockImplementation(() => {
			const EventEmitter = require("node:events");
			mockProc = new EventEmitter();
			mockProc.stdout = new EventEmitter();
			mockProc.stderr = new EventEmitter();
			mockProc.kill = vi.fn();
			mockProc.killed = false;
			mockProc.pid = 12345;
			mockProc.catch = vi.fn().mockResolvedValue(undefined);
			return mockProc as any;
		});

		render(
			<TestComponent autoSpawn={{ name: "exit-agent", command: "true" }} />,
		);

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(1);
		});

		// Simulate exit
		mockProc.emit("exit", 0);

		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents[0].status).toBe("stopped");
			expect(agents[0].exitCode).toBe(0);
		});
	});

	it("should update agent status to stopped when killed", async () => {
		const { execa } = await import("execa");
		const mockExeca = vi.mocked(execa);
		let mockProc: any;

		mockExeca.mockImplementation(() => {
			const EventEmitter = require("node:events");
			mockProc = new EventEmitter();
			mockProc.stdout = new EventEmitter();
			mockProc.stderr = new EventEmitter();
			mockProc.kill = vi.fn(() => {
				mockProc.killed = true;
				mockProc.emit("exit", null);
			});
			mockProc.killed = false;
			mockProc.pid = 12345;
			mockProc.catch = vi.fn().mockResolvedValue(undefined);
			return mockProc as any;
		});

		let capturedApi: UseAgentManagerReturn | null = null;

		render(
			<TestComponent
				onReady={(api) => {
					capturedApi = api;
				}}
				autoSpawn={{ name: "kill-agent", command: "sleep", args: ["100"] }}
			/>,
		);

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(1);
		});

		const agentId = useAgentStore.getState().agents[0].id;
		await capturedApi!.kill(agentId);

		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents[0].status).toBe("stopped");
		});
	});

	it("should kill all agents on killAll", async () => {
		const { execa } = await import("execa");
		const mockExeca = vi.mocked(execa);

		mockExeca.mockImplementation(() => {
			const EventEmitter = require("node:events");
			const mockProc = new EventEmitter();
			mockProc.stdout = new EventEmitter();
			mockProc.stderr = new EventEmitter();
			mockProc.kill = vi.fn(() => {
				mockProc.killed = true;
				mockProc.emit("exit", null);
			});
			mockProc.killed = false;
			mockProc.pid = Math.floor(Math.random() * 10000);
			mockProc.catch = vi.fn().mockResolvedValue(undefined);
			return mockProc as any;
		});

		let capturedApi: UseAgentManagerReturn | null = null;

		render(
			<TestComponent
				onReady={(api) => {
					capturedApi = api;
				}}
			/>,
		);

		await vi.waitFor(() => {
			expect(capturedApi).not.toBeNull();
		});

		const api = capturedApi!;

		// Spawn multiple agents
		await api.spawn({
			name: "agent-1",
			command: "sleep",
			args: ["100"],
		});
		await api.spawn({
			name: "agent-2",
			command: "sleep",
			args: ["100"],
		});

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(2);
		});

		await api.killAll();

		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents.every((a) => a.status === "stopped")).toBe(true);
		});
	});

	it("should cleanup listeners on unmount", async () => {
		const { execa } = await import("execa");
		const mockExeca = vi.mocked(execa);
		let mockProc: any;

		mockExeca.mockImplementation(() => {
			const EventEmitter = require("node:events");
			mockProc = new EventEmitter();
			mockProc.stdout = new EventEmitter();
			mockProc.stderr = new EventEmitter();
			mockProc.kill = vi.fn(() => {
				mockProc.killed = true;
				mockProc.emit("exit", null);
			});
			mockProc.killed = false;
			mockProc.pid = 12345;
			mockProc.catch = vi.fn().mockResolvedValue(undefined);
			return mockProc as any;
		});

		const { unmount } = render(
			<TestComponent
				autoSpawn={{ name: "cleanup-agent", command: "sleep", args: ["100"] }}
			/>,
		);

		await vi.waitFor(() => {
			expect(useAgentStore.getState().agents).toHaveLength(1);
		});

		unmount();

		// Agent should have been killed on unmount
		await vi.waitFor(() => {
			const agents = useAgentStore.getState().agents;
			expect(agents[0].status).toBe("stopped");
		});
	});
});
