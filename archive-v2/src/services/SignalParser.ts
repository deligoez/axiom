import type { ParseResult, Signal, SignalType } from "../types/signal.js";

const SIGNAL_TYPES: SignalType[] = [
	"COMPLETE",
	"BLOCKED",
	"NEEDS_HELP",
	"PROGRESS",
	"RESOLVED",
	"NEEDS_HUMAN",
];

const SIGNAL_REGEX = /<chorus>([A-Z_]+)(?::([^<]*))?<\/chorus>/g;

export class SignalParser {
	parse(output: string): ParseResult {
		const signals = this.parseAll(output);
		if (signals.length === 0) {
			return { signal: null, hasSignal: false };
		}
		return { signal: signals[0], hasSignal: true };
	}

	parseAll(output: string): Signal[] {
		const signals: Signal[] = [];
		const regex = new RegExp(SIGNAL_REGEX.source, "g");
		const matches = output.matchAll(regex);

		for (const match of matches) {
			const type = match[1] as SignalType;
			if (SIGNAL_TYPES.includes(type)) {
				signals.push({
					type,
					payload: match[2]?.trim() || null,
					raw: match[0],
				});
			}
		}

		return signals;
	}

	hasSignal(output: string, type: SignalType): boolean {
		const signals = this.parseAll(output);
		return signals.some((s) => s.type === type);
	}

	isComplete(output: string): boolean {
		return this.hasSignal(output, "COMPLETE");
	}

	isBlocked(output: string): boolean {
		return this.hasSignal(output, "BLOCKED");
	}

	getProgress(output: string): number | null {
		const signals = this.parseAll(output);
		const progressSignal = signals.find((s) => s.type === "PROGRESS");
		if (!progressSignal?.payload) {
			return null;
		}
		const value = Number.parseInt(progressSignal.payload, 10);
		if (Number.isNaN(value)) {
			return null;
		}
		return Math.max(0, Math.min(100, value));
	}

	getReason(output: string): string | null {
		const signals = this.parseAll(output);
		const reasonSignal = signals.find(
			(s) => s.type === "BLOCKED" || s.type === "NEEDS_HELP",
		);
		return reasonSignal?.payload || null;
	}
}
