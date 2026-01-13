import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";
import type {
	ProjectType,
	QualityCommand,
} from "../services/ProjectDetector.js";

// Check for TTY (real terminal or PTY)
// Note: In node-pty spawned processes, stdin.isTTY may be false even with a PTY.
// Check both stdin and stdout for TTY support.
// In test environment (ink-testing-library), stdin works without TTY.
const getIsTTY = () => {
	// Check for test environment (ink-testing-library sets this)
	const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST;
	if (isTestEnv) return true;
	return Boolean(process.stdin?.isTTY || process.stdout?.isTTY);
};

export interface DetectionResult {
	projectType: ProjectType;
	projectName: string;
	qualityCommands: QualityCommand[];
}

export interface WizardConfig {
	projectType: ProjectType;
	projectName: string;
	taskIdPrefix: string;
	qualityCommands: QualityCommand[];
	maxAcceptanceCriteria: number;
	maxDescriptionLength: number;
}

export interface ConfigWizardProps {
	detection: DetectionResult;
	initialStep?: number;
	isLastStep?: boolean;
	onComplete: (config: WizardConfig) => void;
}

// Step 1 = index 0, but this wizard handles Steps 2-4 of 5
// So initialStep 1 = Step 2/5, initialStep 2 = Step 3/5, initialStep 3 = Step 4/5
function getStepDisplay(step: number): string {
	// step 1 = Step 2/5, step 2 = Step 3/5, step 3 = Step 4/5
	return `Step ${step + 1}/5`;
}

function getStepTitle(step: number): string {
	switch (step) {
		case 1:
			return "Project Detection";
		case 2:
			return "Quality Commands";
		case 3:
			return "Task Validation Rules";
		default:
			return "Configuration";
	}
}

// Total wizard steps: 1=Project Detection, 2=Quality Commands, 3=Validation Rules
const FINAL_STEP = 3;

export function ConfigWizard({
	detection,
	initialStep = 1,
	onComplete,
}: ConfigWizardProps): React.ReactElement {
	const [step, setStep] = useState(initialStep);
	const [config] = useState<WizardConfig>({
		projectType: detection.projectType,
		projectName: detection.projectName,
		taskIdPrefix: "ch-",
		qualityCommands: detection.qualityCommands,
		maxAcceptanceCriteria: 15,
		maxDescriptionLength: 1000,
	});

	// Handle keyboard input
	useInput(
		(_input, key) => {
			// Enter key advances to next step or completes wizard
			if (key.return) {
				if (step >= FINAL_STEP) {
					// Final step - complete wizard
					onComplete(config);
				} else {
					// Advance to next step
					setStep((prev) => prev + 1);
				}
			}
		},
		{ isActive: getIsTTY() },
	);

	const renderStepContent = (): React.ReactElement => {
		switch (step) {
			case 1:
				return <ProjectDetectionStep config={config} />;
			case 2:
				return <QualityCommandsStep commands={config.qualityCommands} />;
			case 3:
				return (
					<ValidationRulesStep
						maxCriteria={config.maxAcceptanceCriteria}
						maxLength={config.maxDescriptionLength}
					/>
				);
			default:
				return <ProjectDetectionStep config={config} />;
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					{getStepDisplay(step)}
				</Text>
				<Text> - </Text>
				<Text bold>{getStepTitle(step)}</Text>
			</Box>
			{renderStepContent()}
			<Box marginTop={1}>
				<Text dimColor>Press Enter to continue, Tab to navigate fields</Text>
			</Box>
		</Box>
	);
}

interface ProjectDetectionStepProps {
	config: WizardConfig;
}

function ProjectDetectionStep({
	config,
}: ProjectDetectionStepProps): React.ReactElement {
	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text>Project Type: </Text>
				<Text color="green" bold>
					{config.projectType}
				</Text>
			</Box>
			<Box>
				<Text>Project Name: </Text>
				<Text color="green" bold>
					{config.projectName}
				</Text>
			</Box>
			<Box>
				<Text>Task ID Prefix: </Text>
				<Text color="green" bold>
					{config.taskIdPrefix}
				</Text>
			</Box>
		</Box>
	);
}

interface QualityCommandsStepProps {
	commands: QualityCommand[];
}

function QualityCommandsStep({
	commands,
}: QualityCommandsStepProps): React.ReactElement {
	return (
		<Box flexDirection="column" gap={1}>
			<Text bold>Quality Commands:</Text>
			{commands.map((cmd, idx) => (
				<Box key={`${cmd.name}-${idx}`} gap={1}>
					<Text dimColor>{idx + 1}.</Text>
					<Text bold>{cmd.name}</Text>
					<Text color="cyan">{cmd.command}</Text>
					<Text color={cmd.required ? "green" : "yellow"}>
						({cmd.required ? "required" : "optional"})
					</Text>
				</Box>
			))}
			<Box marginTop={1}>
				<Text dimColor>
					Commands: add &lt;name&gt; &lt;command&gt; | toggle &lt;n&gt; | remove
					&lt;n&gt;
				</Text>
			</Box>
		</Box>
	);
}

interface ValidationRulesStepProps {
	maxCriteria: number;
	maxLength: number;
}

function ValidationRulesStep({
	maxCriteria,
	maxLength,
}: ValidationRulesStepProps): React.ReactElement {
	return (
		<Box flexDirection="column" gap={1}>
			<Text bold>Built-in Rules (always applied):</Text>
			<Box flexDirection="column" paddingLeft={2}>
				<Text>- Tasks must be atomic (single responsibility)</Text>
				<Text>- Tasks must be testable (measurable criteria)</Text>
				<Text>- Tasks must be right-sized (context-appropriate)</Text>
			</Box>
			<Box marginTop={1}>
				<Text bold>Configurable Limits:</Text>
			</Box>
			<Box flexDirection="column" paddingLeft={2}>
				<Box gap={1}>
					<Text>Max acceptance criteria:</Text>
					<Text color="green" bold>
						{maxCriteria}
					</Text>
				</Box>
				<Box gap={1}>
					<Text>Max description length:</Text>
					<Text color="green" bold>
						{maxLength}
					</Text>
					<Text dimColor>characters</Text>
				</Box>
			</Box>
		</Box>
	);
}
