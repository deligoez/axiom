import type { CommandResult } from "./QualityCommandRunner.js";

export interface QualityCommand {
	name: string;
	command: string;
	required: boolean;
	order: number;
}

export interface RunResult {
	name: string;
	success: boolean;
	output: string;
	duration: number;
}

export interface CommandRunner {
	run(command: string): Promise<CommandResult>;
}

export class QualityCommandsManager {
	private commands: QualityCommand[] = [];

	constructor(private runner: CommandRunner) {}

	/**
	 * Get all commands
	 */
	getCommands(): QualityCommand[] {
		return [...this.commands];
	}

	/**
	 * Add a new quality command
	 */
	add(name: string, command: string, required: boolean): void {
		this.commands.push({
			name,
			command,
			required,
			order: this.commands.length,
		});
	}

	/**
	 * Remove command at index
	 */
	remove(index: number): void {
		if (index < 0 || index >= this.commands.length) {
			throw new Error("Index out of bounds");
		}
		this.commands.splice(index, 1);
		// Update order numbers
		this.commands.forEach((cmd, i) => {
			cmd.order = i;
		});
	}

	/**
	 * Toggle required/optional status
	 */
	toggle(index: number): void {
		if (index < 0 || index >= this.commands.length) {
			throw new Error("Index out of bounds");
		}
		this.commands[index].required = !this.commands[index].required;
	}

	/**
	 * Reorder commands
	 */
	reorder(from: number, to: number): void {
		if (
			from < 0 ||
			from >= this.commands.length ||
			to < 0 ||
			to >= this.commands.length
		) {
			throw new Error("Index out of bounds");
		}
		const [removed] = this.commands.splice(from, 1);
		this.commands.splice(to, 0, removed);
		// Update order numbers
		this.commands.forEach((cmd, i) => {
			cmd.order = i;
		});
	}

	/**
	 * Run all commands in order
	 * Stops on first required command failure
	 */
	async runAll(): Promise<RunResult[]> {
		const results: RunResult[] = [];

		for (const cmd of this.commands) {
			const result = await this.runner.run(cmd.command);
			results.push({
				name: cmd.name,
				success: result.success,
				output: result.output,
				duration: result.duration,
			});

			// Stop on required command failure
			if (!result.success && cmd.required) {
				break;
			}
		}

		return results;
	}

	/**
	 * Run only required commands
	 */
	async runRequired(): Promise<RunResult[]> {
		const results: RunResult[] = [];
		const requiredCommands = this.commands.filter((cmd) => cmd.required);

		for (const cmd of requiredCommands) {
			const result = await this.runner.run(cmd.command);
			results.push({
				name: cmd.name,
				success: result.success,
				output: result.output,
				duration: result.duration,
			});

			if (!result.success) {
				break;
			}
		}

		return results;
	}
}
