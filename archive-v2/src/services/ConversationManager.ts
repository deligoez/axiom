export type MessageRole = "user" | "assistant" | "system";

export interface Message {
	role: MessageRole;
	content: string;
	timestamp: string;
}

export interface ConversationState {
	messages: Message[];
}

const DEFAULT_MAX_MESSAGES = 100;

export class ConversationManager {
	private messages: Message[] = [];
	private maxMessages: number;

	constructor(maxMessages: number = DEFAULT_MAX_MESSAGES) {
		this.maxMessages = maxMessages;
	}

	/**
	 * Add a user message
	 */
	addUserMessage(text: string): void {
		this.addMessage("user", text);
	}

	/**
	 * Add an agent (assistant) message
	 */
	addAgentMessage(text: string): void {
		this.addMessage("assistant", text);
	}

	/**
	 * Add a system message
	 */
	addSystemMessage(text: string): void {
		this.addMessage("system", text);
	}

	/**
	 * Get all messages in history
	 */
	getHistory(): Message[] {
		return [...this.messages];
	}

	/**
	 * Get the last N messages
	 */
	getLastN(n: number): Message[] {
		return this.messages.slice(-n);
	}

	/**
	 * Clear all messages
	 */
	clear(): void {
		this.messages = [];
	}

	/**
	 * Format messages for agent prompt input
	 */
	toPromptFormat(): string {
		return this.messages.map((m) => `[${m.role}]\n${m.content}`).join("\n\n");
	}

	/**
	 * Serialize conversation for persistence
	 */
	serialize(): string {
		const state: ConversationState = {
			messages: this.messages,
		};
		return JSON.stringify(state);
	}

	/**
	 * Restore conversation from serialized state
	 */
	restore(json: string): void {
		const state = JSON.parse(json) as ConversationState;
		this.messages = state.messages;
	}

	/**
	 * Add a message to the conversation
	 */
	private addMessage(role: MessageRole, content: string): void {
		const message: Message = {
			role,
			content,
			timestamp: new Date().toISOString(),
		};

		this.messages.push(message);

		// Truncate oldest messages if exceeding limit
		if (this.messages.length > this.maxMessages) {
			this.messages = this.messages.slice(-this.maxMessages);
		}
	}
}
