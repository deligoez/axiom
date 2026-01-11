import { Box, Text, useApp } from "ink";
import { useMemo, useState } from "react";
import HelpPanel from "./components/HelpPanel.js";
import Layout from "./components/Layout.js";
import MainContent from "./components/MainContent.js";
import TaskPanel from "./components/TaskPanel.js";
import { useAgentManager } from "./hooks/useAgentManager.js";
import { useBeadsManager } from "./hooks/useBeadsManager.js";
import { useKeyboard } from "./hooks/useKeyboard.js";
import { useAgentStore } from "./stores/agentStore.js";
import { useBeadsStore } from "./stores/beadsStore.js";

interface AppProps {
	showVersion?: boolean;
	showHelp?: boolean;
	onExit?: () => void;
	projectDir?: string;
	ciMode?: boolean;
}

export default function App({
	showVersion,
	showHelp,
	onExit,
	projectDir = process.cwd(),
	ciMode = false,
}: AppProps) {
	const { exit } = useApp();
	const [helpVisible, setHelpVisible] = useState(false);
	const agents = useAgentStore((state) => state.agents);
	const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
	const selectAgent = useAgentStore((state) => state.selectAgent);
	const beads = useBeadsStore((state) => state.beads);
	const selectedBeadId = useBeadsStore((state) => state.selectedBeadId);
	const { spawn, killAll } = useAgentManager();
	useBeadsManager(projectDir);

	// Compute task stats from beads
	const taskStats = useMemo(() => {
		return beads.reduce(
			(stats, bead) => {
				switch (bead.status) {
					case "closed":
						stats.done++;
						break;
					case "in_progress":
						stats.running++;
						break;
					case "open":
						stats.pending++;
						break;
					case "blocked":
					case "failed":
						stats.blocked++;
						break;
				}
				return stats;
			},
			{ done: 0, running: 0, pending: 0, blocked: 0 },
		);
	}, [beads]);

	const handleExit = async () => {
		await killAll();
		onExit?.();
		exit();
	};

	const handleSpawn = async () => {
		const agentNumber = agents.length + 1;
		const agent = await spawn({
			name: `demo-agent-${agentNumber}`,
			command: "bash",
			args: ["-c", 'for i in {1..5}; do echo "Output line $i"; sleep 1; done'],
		});
		// Auto-select the new agent if none selected
		if (!selectedAgentId) {
			selectAgent(agent.id);
		}
	};

	const handleNavigate = (direction: "next" | "prev") => {
		if (agents.length === 0) return;

		const currentIndex = agents.findIndex((a) => a.id === selectedAgentId);
		let nextIndex: number;

		if (currentIndex === -1) {
			// No selection, select first
			nextIndex = 0;
		} else if (direction === "next") {
			nextIndex = (currentIndex + 1) % agents.length;
		} else {
			nextIndex = (currentIndex - 1 + agents.length) % agents.length;
		}

		selectAgent(agents[nextIndex].id);
	};

	const handleToggleHelp = () => {
		setHelpVisible((prev) => !prev);
	};

	// Only enable keyboard input when not in CI mode (CI mode has no TTY)
	useKeyboard({
		onQuit: handleExit,
		onSpawn: handleSpawn,
		onNavigate: handleNavigate,
		onToggleHelp: handleToggleHelp,
		isActive: !ciMode,
	});

	if (showVersion) {
		return <Text>0.1.0</Text>;
	}

	if (showHelp) {
		return (
			<Box flexDirection="column">
				<Text bold>Usage: chorus [options]</Text>
				<Text> </Text>
				<Text>Options:</Text>
				<Text> -v, --version Show version</Text>
				<Text> -h, --help Show help</Text>
			</Box>
		);
	}

	return (
		<Layout
			agentCount={agents.length}
			taskCount={beads.length}
			taskStats={taskStats}
			mergeQueue={{ queued: 0 }}
		>
			<Box flexGrow={1} position="relative">
				<Box flexDirection="row" flexGrow={1}>
					{/* Task Panel - Left Side */}
					<Box
						width={30}
						borderStyle="single"
						borderColor="gray"
						paddingX={1}
						flexDirection="column"
					>
						<TaskPanel beads={beads} selectedBeadId={selectedBeadId} />
					</Box>

					{/* Agent Panel - Right Side */}
					<Box flexGrow={1}>
						<MainContent agents={agents} selectedAgentId={selectedAgentId} />
					</Box>
				</Box>
				{helpVisible && (
					<Box
						position="absolute"
						justifyContent="center"
						alignItems="center"
						width="100%"
						height="100%"
					>
						<HelpPanel visible={helpVisible} />
					</Box>
				)}
			</Box>
		</Layout>
	);
}
