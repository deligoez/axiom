export type SignalType =
	| "COMPLETE"
	| "BLOCKED"
	| "NEEDS_HELP"
	| "PROGRESS"
	| "RESOLVED"
	| "NEEDS_HUMAN";

export interface Signal {
	type: SignalType;
	payload: string | null;
	raw: string;
}

export interface ParseResult {
	signal: Signal | null;
	hasSignal: boolean;
}
