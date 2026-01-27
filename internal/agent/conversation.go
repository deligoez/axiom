package agent

import (
	"fmt"
	"strings"
)

// Message represents a single message in a conversation.
type Message struct {
	Role    string // "user" or "assistant"
	Content string
}

// Format returns the message as a formatted string.
func (m Message) Format() string {
	role := strings.Title(m.Role) //nolint:staticcheck // strings.Title is fine for "user"/"assistant"
	return fmt.Sprintf("%s: %s", role, m.Content)
}

// Conversation holds the message history for multi-turn agent interactions.
type Conversation struct {
	Messages []Message
}

// NewConversation creates an empty conversation.
func NewConversation() *Conversation {
	return &Conversation{
		Messages: []Message{},
	}
}

// AddMessage appends a message to the conversation.
func (c *Conversation) AddMessage(role, content string) {
	c.Messages = append(c.Messages, Message{
		Role:    role,
		Content: content,
	})
}

// FormatHistory returns the conversation as a formatted string for inclusion in prompts.
func (c *Conversation) FormatHistory() string {
	if len(c.Messages) == 0 {
		return ""
	}

	var lines []string
	for _, msg := range c.Messages {
		lines = append(lines, msg.Format())
	}
	return strings.Join(lines, "\n")
}

// BuildPromptWithHistory combines base prompt with conversation history.
func (c *Conversation) BuildPromptWithHistory(basePrompt string) string {
	history := c.FormatHistory()
	if history == "" {
		return basePrompt
	}

	return fmt.Sprintf("%s\n\n## Conversation History\n\n%s", basePrompt, history)
}
