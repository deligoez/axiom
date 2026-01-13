/**
 * Persona Type Definitions
 *
 * Core types for all agent personas in Chorus.
 */

/**
 * Names of all personas in the Chorus system.
 */
export type PersonaName =
	| "sage"
	| "chip"
	| "archie"
	| "patch"
	| "scout"
	| "echo";

/**
 * Agent roles describing what each persona does.
 */
export type AgentRole =
	| "analyzer" // Sage: analyzes project structure
	| "implementer" // Chip: implements features
	| "architect" // Archie: designs architecture
	| "fixer" // Patch: fixes bugs
	| "explorer" // Scout: explores codebase
	| "reviewer"; // Echo: reviews code

/**
 * Power source for agent decision-making.
 */
export type AgentPowerSource = "claude" | "heuristic" | "xstate";

/**
 * Complete persona definition.
 */
export interface Persona {
	/** Persona identifier */
	name: PersonaName;
	/** What this persona does */
	role: AgentRole;
	/** Display name for UI */
	displayName: string;
	/** Short description */
	description: string;
	/** Power source for decision-making */
	powerSource: AgentPowerSource;
	/** Primary color for UI theming */
	color: string;
	/** Whether this persona is singular (only one instance) */
	singular: boolean;
}

/**
 * All personas in the Chorus system.
 */
export const PERSONAS: Record<PersonaName, Persona> = {
	sage: {
		name: "sage",
		role: "analyzer",
		displayName: "Sage",
		description: "Analyzes project structure and suggests configurations",
		powerSource: "claude",
		color: "magenta",
		singular: true,
	},
	chip: {
		name: "chip",
		role: "implementer",
		displayName: "Chip",
		description: "Implements features and writes code",
		powerSource: "claude",
		color: "cyan",
		singular: false,
	},
	archie: {
		name: "archie",
		role: "architect",
		displayName: "Archie",
		description: "Designs architecture and makes design decisions",
		powerSource: "claude",
		color: "yellow",
		singular: true,
	},
	patch: {
		name: "patch",
		role: "fixer",
		displayName: "Patch",
		description: "Fixes bugs and resolves issues",
		powerSource: "claude",
		color: "green",
		singular: false,
	},
	scout: {
		name: "scout",
		role: "explorer",
		displayName: "Scout",
		description: "Explores codebase and gathers information",
		powerSource: "claude",
		color: "blue",
		singular: false,
	},
	echo: {
		name: "echo",
		role: "reviewer",
		displayName: "Echo",
		description: "Reviews code and provides feedback",
		powerSource: "claude",
		color: "red",
		singular: true,
	},
};

/**
 * Agent identity with instance number for spawned agents.
 */
export interface AgentIdentity {
	/** Unique identifier (e.g., 'chip-001' or 'sage') */
	id: string;
	/** Persona name */
	persona: PersonaName;
	/** Instance number (undefined for singular personas) */
	instanceNumber?: number;
	/** Display name (e.g., 'Chip-001' or 'Sage') */
	displayName: string;
}

/**
 * Create an agent identity.
 * For singular personas, no instance number is used.
 * For multi-instance personas, the number is padded to 3 digits.
 */
export function createAgentIdentity(
	persona: PersonaName,
	instanceNumber?: number,
): AgentIdentity {
	const personaInfo = PERSONAS[persona];
	const isSingular = personaInfo.singular;

	if (isSingular || instanceNumber === undefined) {
		return {
			id: persona,
			persona,
			displayName: personaInfo.displayName,
		};
	}

	const paddedNumber = instanceNumber.toString().padStart(3, "0");
	return {
		id: `${persona}-${paddedNumber}`,
		persona,
		instanceNumber,
		displayName: `${personaInfo.displayName}-${paddedNumber}`,
	};
}
