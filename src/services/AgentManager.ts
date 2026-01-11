import { EventEmitter } from "node:events";
import { execa, type ResultPromise } from "execa";
import { type Agent, type AgentConfig, createAgent } from "../types/agent.js";

type AgentManagerEvents = {
	output: [id: string, line: string];
	exit: [id: string, code: number | null];
	error: [id: string, error: Error];
};

export class AgentManager extends EventEmitter<AgentManagerEvents> {
	private agents: Map<string, Agent> = new Map();
	private processes: Map<string, ResultPromise> = new Map();

	list(): Agent[] {
		return Array.from(this.agents.values());
	}

	get(id: string): Agent | undefined {
		return this.agents.get(id);
	}

	async spawn(config: AgentConfig): Promise<Agent> {
		const agent = createAgent(config);
		agent.status = "running";

		this.agents.set(agent.id, agent);

		const proc = execa(config.command, config.args ?? [], {
			cwd: config.cwd,
			env: config.env,
			reject: false,
		});

		agent.pid = proc.pid;
		this.processes.set(agent.id, proc);

		// Stream stdout
		proc.stdout?.on("data", (data: Buffer) => {
			const lines = data.toString().split("\n").filter(Boolean);
			for (const line of lines) {
				agent.output.push(line);
				this.emit("output", agent.id, line);
			}
		});

		// Stream stderr
		proc.stderr?.on("data", (data: Buffer) => {
			const lines = data.toString().split("\n").filter(Boolean);
			for (const line of lines) {
				agent.output.push(line);
				this.emit("output", agent.id, line);
			}
		});

		// Handle exit
		proc.on("exit", (code) => {
			agent.status = "stopped";
			agent.exitCode = code ?? undefined;
			this.emit("exit", agent.id, code);
		});

		proc.on("error", (error) => {
			agent.status = "error";
			this.emit("error", agent.id, error);
		});

		return agent;
	}

	async kill(id: string): Promise<void> {
		const proc = this.processes.get(id);
		const agent = this.agents.get(id);

		if (proc && !proc.killed) {
			proc.kill("SIGTERM");
			await proc.catch(() => {}); // Wait for exit
		}

		if (agent) {
			agent.status = "stopped";
		}
	}

	async killAll(): Promise<void> {
		const killPromises = Array.from(this.agents.keys()).map((id) =>
			this.kill(id),
		);
		await Promise.all(killPromises);
	}
}
