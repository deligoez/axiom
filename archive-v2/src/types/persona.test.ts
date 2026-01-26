import { describe, expect, it } from "vitest";
import { createAgentIdentity, PERSONAS, type PersonaName } from "./persona.js";

describe("Persona Types", () => {
	describe("PersonaName type", () => {
		it("includes all 6 persona names", () => {
			// Arrange
			const names: PersonaName[] = [
				"sage",
				"chip",
				"archie",
				"patch",
				"scout",
				"echo",
			];

			// Assert
			expect(names).toHaveLength(6);
		});
	});

	describe("PERSONAS constant", () => {
		it("contains all 6 personas with correct properties", () => {
			// Assert
			expect(Object.keys(PERSONAS)).toHaveLength(6);
			expect(PERSONAS.sage).toBeDefined();
			expect(PERSONAS.chip).toBeDefined();
			expect(PERSONAS.archie).toBeDefined();
			expect(PERSONAS.patch).toBeDefined();
			expect(PERSONAS.scout).toBeDefined();
			expect(PERSONAS.echo).toBeDefined();

			// Each persona has required properties
			for (const persona of Object.values(PERSONAS)) {
				expect(persona.name).toBeDefined();
				expect(persona.role).toBeDefined();
				expect(persona.powerSource).toBeDefined();
				expect(persona.color).toBeDefined();
				expect(typeof persona.singular).toBe("boolean");
			}
		});
	});

	describe("createAgentIdentity()", () => {
		it("returns correct identity for numbered persona", () => {
			// Arrange & Act
			const identity = createAgentIdentity("chip", 1);

			// Assert
			expect(identity.id).toBe("chip-001");
			expect(identity.persona).toBe("chip");
			expect(identity.instanceNumber).toBe(1);
			expect(identity.displayName).toBe("Chip-001");
		});

		it("returns correct identity for singular persona (no number)", () => {
			// Arrange & Act
			const identity = createAgentIdentity("sage");

			// Assert
			expect(identity.id).toBe("sage");
			expect(identity.persona).toBe("sage");
			expect(identity.instanceNumber).toBeUndefined();
			expect(identity.displayName).toBe("Sage");
		});
	});
});
