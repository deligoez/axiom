import { QualityCommandRunner } from "./QualityCommandRunner.js";
import { SignalParser } from "./SignalParser.js";

export interface CompletionConfig {
	requireTests: boolean;
	testCommand: string;
}

export interface CompletionResult {
	complete: boolean;
	hasSignal: boolean;
	testsPassed?: boolean;
	reason?: string;
	testOutput?: string;
}

export interface BlockedResult {
	blocked: boolean;
	reason?: string;
}

export interface NeedsHelpResult {
	needsHelp: boolean;
	question?: string;
}

export class CompletionChecker {
	private parser: SignalParser;
	private runner: QualityCommandRunner;
	private config: CompletionConfig;

	constructor(
		projectDir: string,
		config: CompletionConfig,
		parser?: SignalParser,
		runner?: QualityCommandRunner,
	) {
		this.parser = parser ?? new SignalParser();
		this.runner = runner ?? new QualityCommandRunner(projectDir);
		this.config = config;
	}

	async check(
		output: string,
		worktreePath?: string,
	): Promise<CompletionResult> {
		const hasSignal = this.parser.isComplete(output);

		// If no signal, not complete
		if (!hasSignal) {
			return {
				complete: false,
				hasSignal: false,
			};
		}

		// If requireTests is false, signal alone is enough
		if (!this.config.requireTests) {
			return {
				complete: true,
				hasSignal: true,
			};
		}

		// Run tests to verify completion
		const testResult = await this.runner.run(
			this.config.testCommand,
			worktreePath,
		);

		return {
			complete: testResult.success,
			hasSignal: true,
			testsPassed: testResult.success,
			testOutput: testResult.output,
		};
	}

	hasCompletionSignal(output: string): boolean {
		return this.parser.isComplete(output);
	}

	isBlocked(output: string): BlockedResult {
		const blocked = this.parser.isBlocked(output);
		if (!blocked) {
			return { blocked: false };
		}

		const reason = this.parser.getReason(output);
		return {
			blocked: true,
			reason: reason ?? undefined,
		};
	}

	needsHelp(output: string): NeedsHelpResult {
		const result = this.parser.parse(output);
		if (!result.hasSignal || result.signal?.type !== "NEEDS_HELP") {
			return { needsHelp: false };
		}

		return {
			needsHelp: true,
			question: result.signal.payload ?? undefined,
		};
	}
}
