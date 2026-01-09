import type { Bead, BeadJSONL, BeadStatus, BeadType, BeadPriority } from '../types/bead.js';

export interface ParseOptions {
  includeTombstones?: boolean;
}

function isValidStatus(status: string): status is BeadStatus {
  return ['open', 'in_progress', 'closed', 'blocked', 'tombstone'].includes(status);
}

function isValidType(type: string): type is BeadType {
  return ['task', 'bug', 'feature', 'epic'].includes(type);
}

function isValidPriority(priority: number): priority is BeadPriority {
  return [0, 1, 2, 3, 4].includes(priority);
}

export function parseBeadLine(line: string): Bead | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const json: BeadJSONL = JSON.parse(trimmed);

    // Validate required fields
    if (!json.id || !json.title || !json.status || json.priority === undefined || !json.type || !json.created || !json.updated) {
      return null;
    }

    // Validate field values
    if (!isValidStatus(json.status) || !isValidType(json.type) || !isValidPriority(json.priority)) {
      return null;
    }

    const bead: Bead = {
      id: json.id,
      title: json.title,
      status: json.status,
      priority: json.priority,
      type: json.type,
      created: json.created,
      updated: json.updated,
    };

    // Optional fields
    if (json.assignee) bead.assignee = json.assignee;
    if (json.description) bead.description = json.description;
    if (json.closed) bead.closed = json.closed;
    if (json.closed_reason) bead.closedReason = json.closed_reason;
    if (json.dependencies) bead.dependencies = json.dependencies;
    if (json.ephemeral !== undefined) bead.ephemeral = json.ephemeral;

    return bead;
  } catch {
    return null;
  }
}

export function parseBeadsJSONL(content: string, options: ParseOptions = {}): Bead[] {
  const { includeTombstones = false } = options;

  const lines = content.split('\n');
  const beads: Bead[] = [];

  for (const line of lines) {
    const bead = parseBeadLine(line);
    if (bead) {
      if (!includeTombstones && bead.status === 'tombstone') {
        continue;
      }
      beads.push(bead);
    }
  }

  return beads;
}

export function serializeBeadLine(bead: Bead): string {
  const json: BeadJSONL = {
    id: bead.id,
    title: bead.title,
    status: bead.status,
    priority: bead.priority,
    type: bead.type,
    created: bead.created,
    updated: bead.updated,
  };

  if (bead.assignee) json.assignee = bead.assignee;
  if (bead.description) json.description = bead.description;
  if (bead.closed) json.closed = bead.closed;
  if (bead.closedReason) json.closed_reason = bead.closedReason;
  if (bead.dependencies) json.dependencies = bead.dependencies;
  if (bead.ephemeral !== undefined) json.ephemeral = bead.ephemeral;

  return JSON.stringify(json);
}
