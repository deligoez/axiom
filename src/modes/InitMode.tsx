import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Box, Text, useInput } from "ink";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AgentIntroduction } from "../components/AgentIntroduction.js";
import {
	ConfigWizard,
	type DetectionResult,
	type WizardConfig,
} from "../components/ConfigWizard.js";
import { PlanReviewConfigStep } from "../components/init/PlanReviewConfigStep.js";
import { ProjectDetector } from "../services/ProjectDetector.js";
import type { PlanReviewConfig } from "../types/config.js";

export interface PrerequisiteCheck {
	name: string;
	passed: boolean;
	message: string;
}

export interface InitModeProps {
	projectDir: string;
	onComplete: (config: WizardConfig & { planReview: PlanReviewConfig }) => void;
	onLog?: (event: {
		mode: string;
		eventType: string;
		details: Record<string, unknown>;
	}) => void;
	nonInteractive?: boolean;
	skipPrerequisites?: boolean;
}

type InitStep =
	| "checking_existing"
	| "prerequisites"
	| "wizard_project"
	| "wizard_commands"
	| "wizard_rules"
	| "plan_review"
	| "meet_team_prompt"
	| "agent_introduction"
	| "complete"
	| "error";

/** Check for TTY (real terminal or PTY) */
const getIsTTY = () => Boolean(process.stdin?.isTTY || process.stdout?.isTTY);

/**
 * Prompt asking if user wants to meet the team.
 */
function MeetTeamPrompt({
	onYes,
	onNo,
}: {
	onYes: () => void;
	onNo: () => void;
}): React.ReactElement {
	useInput(
		(input) => {
			if (input.toLowerCase() === "y") {
				onYes();
			} else if (input.toLowerCase() === "n") {
				onNo();
			}
		},
		{ isActive: getIsTTY() },
	);

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Would you like to meet your Chorus team? (y/n)
			</Text>
		</Box>
	);
}

/**
 * Check system prerequisites for Chorus
 */
export function checkPrerequisites(): PrerequisiteCheck[] {
	const checks: PrerequisiteCheck[] = [];

	// Check git
	try {
		execSync("git --version", { stdio: "pipe" });
		checks.push({ name: "git", passed: true, message: "Git found" });
	} catch {
		checks.push({
			name: "git",
			passed: false,
			message: "Git not found",
		});
	}

	// Check Node.js version
	try {
		const version = process.version.slice(1); // Remove 'v' prefix
		const major = Number.parseInt(version.split(".")[0], 10);
		if (major >= 20) {
			checks.push({
				name: "node",
				passed: true,
				message: `Node.js ${version} found`,
			});
		} else {
			checks.push({
				name: "node",
				passed: false,
				message: `Node.js >= 20 required (found ${version})`,
			});
		}
	} catch {
		checks.push({
			name: "node",
			passed: false,
			message: "Node.js version check failed",
		});
	}

	// Check Beads CLI
	try {
		execSync("bd --version", { stdio: "pipe" });
		checks.push({ name: "bd", passed: true, message: "Beads CLI found" });
	} catch {
		checks.push({
			name: "bd",
			passed: false,
			message: "Beads CLI (bd) not found",
		});
	}

	// Check Claude CLI
	try {
		execSync("which claude", { stdio: "pipe" });
		checks.push({ name: "claude", passed: true, message: "Claude CLI found" });
	} catch {
		checks.push({
			name: "claude",
			passed: false,
			message: "Claude CLI not found",
		});
	}

	return checks;
}

export function InitMode({
	projectDir,
	onComplete: _onComplete,
	onLog: _onLog,
	nonInteractive = false,
	skipPrerequisites = false,
}: InitModeProps): React.ReactElement {
	const [step, setStep] = useState<InitStep>("checking_existing");
	const [error, setError] = useState<string | null>(null);
	const [checks, setChecks] = useState<PrerequisiteCheck[]>([]);
	const [detection, setDetection] = useState<DetectionResult | null>(null);
	const [_wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null);

	const defaultPlanReview: PlanReviewConfig = {
		enabled: true,
		maxIterations: 5,
		triggerOn: ["cross_cutting", "architectural"],
		autoApply: "minor",
		requireApproval: ["redundant", "dependency_change"],
	};

	const runProjectDetection = useCallback(() => {
		try {
			const detector = new ProjectDetector(projectDir);
			const projectType = detector.detect();
			const projectName = detector.getProjectName();
			const qualityCommands = detector.suggestQualityCommands(projectType);

			setDetection({
				projectType,
				projectName,
				qualityCommands,
			});

			if (nonInteractive) {
				// In non-interactive mode, use defaults
				setStep("complete");
			} else {
				setStep("wizard_project");
			}
		} catch {
			setError("Failed to detect project settings");
			setStep("error");
		}
	}, [projectDir, nonInteractive]);

	// Check for existing .chorus directory
	useEffect(() => {
		if (step !== "checking_existing") return;

		const chorusDir = join(projectDir, ".chorus");
		if (existsSync(chorusDir)) {
			setError(
				"Chorus already initialized. Directory .chorus/ already exists.",
			);
			setStep("error");
			return;
		}

		// Check if projectDir exists
		if (!existsSync(projectDir)) {
			setError(`Project directory does not exist: ${projectDir}`);
			setStep("error");
			return;
		}

		// Run prerequisites check
		if (skipPrerequisites) {
			// Skip to project detection
			runProjectDetection();
		} else {
			setStep("prerequisites");
		}
	}, [step, projectDir, skipPrerequisites, runProjectDetection]);

	// Run prerequisite checks
	useEffect(() => {
		if (step !== "prerequisites") return;

		const results = checkPrerequisites();
		setChecks(results);

		// In non-interactive mode, check if all passed
		if (nonInteractive) {
			const allPassed = results.every((c) => c.passed);
			if (!allPassed) {
				const failed = results.filter((c) => !c.passed);
				setError(
					`Prerequisites failed: ${failed.map((f) => f.name).join(", ")}`,
				);
				setStep("error");
				return;
			}
		}

		// After a short delay, move to project detection
		setTimeout(() => {
			runProjectDetection();
		}, 100);
	}, [step, nonInteractive, runProjectDetection]);

	const handleWizardComplete = (config: WizardConfig) => {
		setWizardConfig(config);
		setStep("plan_review");
	};

	const handlePlanReviewComplete = (_planReview: PlanReviewConfig) => {
		if (nonInteractive) {
			setStep("complete");
		} else {
			setStep("meet_team_prompt");
		}
	};

	// Render based on current step
	if (step === "error" || error) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red" bold>
					Error: {error}
				</Text>
			</Box>
		);
	}

	if (step === "checking_existing") {
		return (
			<Box flexDirection="column" padding={1}>
				<Text dimColor>Checking project directory...</Text>
			</Box>
		);
	}

	if (step === "prerequisites") {
		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold color="cyan">
						Step 1/5
					</Text>
					<Text> - </Text>
					<Text bold>Prerequisites Check</Text>
				</Box>
				<Box flexDirection="column" gap={1}>
					{checks.length === 0 ? (
						<Text dimColor>Checking prerequisites...</Text>
					) : (
						checks.map((check) => (
							<Box key={check.name} gap={1}>
								<Text color={check.passed ? "green" : "red"}>
									{check.passed ? "✓" : "✗"}
								</Text>
								<Text>{check.name}</Text>
								<Text dimColor>- {check.message}</Text>
							</Box>
						))
					)}
				</Box>
			</Box>
		);
	}

	if (step === "wizard_project" && detection) {
		return (
			<ConfigWizard
				detection={detection}
				initialStep={1}
				onComplete={handleWizardComplete}
			/>
		);
	}

	if (step === "plan_review") {
		return (
			<PlanReviewConfigStep
				config={defaultPlanReview}
				onComplete={handlePlanReviewComplete}
			/>
		);
	}

	if (step === "meet_team_prompt") {
		return (
			<MeetTeamPrompt
				onYes={() => setStep("agent_introduction")}
				onNo={() => setStep("complete")}
			/>
		);
	}

	if (step === "agent_introduction") {
		return (
			<AgentIntroduction
				projectDir={projectDir}
				onFinish={() => setStep("complete")}
			/>
		);
	}

	if (step === "complete") {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="green" bold>
					✓ Chorus initialized successfully!
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text dimColor>Initializing...</Text>
		</Box>
	);
}
