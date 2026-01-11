import { Box, Text } from "ink";
import type React from "react";

export interface AgentTileOutputProps {
	statusText?: string;
	lastCommand?: string;
	testResult?: {
		passed: number;
		failed: number;
	};
}

export function AgentTileOutput({
	statusText,
	lastCommand,
	testResult,
}: AgentTileOutputProps): React.ReactElement {
	return (
		<Box flexDirection="column">
			{statusText && <Text dimColor>{statusText}</Text>}
			{lastCommand && (
				<Text>
					<Text color="gray">$</Text> {lastCommand}
				</Text>
			)}
			{testResult && <TestResultDisplay testResult={testResult} />}
		</Box>
	);
}

interface TestResultDisplayProps {
	testResult: {
		passed: number;
		failed: number;
	};
}

function TestResultDisplay({
	testResult,
}: TestResultDisplayProps): React.ReactElement {
	const { passed, failed } = testResult;
	const hasFailures = failed > 0;
	const total = passed + failed;

	if (total === 0) {
		return <Text dimColor>0 tests</Text>;
	}

	if (hasFailures) {
		return (
			<Text>
				<Text color="red">✗</Text> <Text color="green">{passed} passed</Text>,{" "}
				<Text color="red">{failed} failed</Text>
			</Text>
		);
	}

	return (
		<Text>
			<Text color="green">✓</Text> {passed} tests passed
		</Text>
	);
}
