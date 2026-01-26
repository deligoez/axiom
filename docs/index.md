---
layout: home

hero:
  name: AXIOM
  text: Multi-agent AI Coding Orchestrator
  tagline: Orchestrate multiple Claude Code agents working on your codebase with structured planning, isolated workspaces, and collective learning
  actions:
    - theme: brand
      text: Get Started
      link: /00-overview
    - theme: alt
      text: View on GitHub
      link: https://github.com/deligoez/chorus

features:
  - icon: 🎭
    title: 8 Specialized Personas
    details: Each agent has a distinct role — Ava analyzes, Axel plans, Echo implements, Rex resolves conflicts, Cleo curates learnings, Dex orchestrates, Max monitors, Ash audits.
    link: /05-agents
    linkText: Meet the Personas

  - icon: 📦
    title: Case-Driven Architecture
    details: 8 case types form a complete work hierarchy — from high-level Directives through Operations and Tasks down to atomic Discoveries. Everything is a case.
    link: /04-cases
    linkText: Explore Cases

  - icon: 🌳
    title: Git Worktree Isolation
    details: Each agent works in its own git worktree. No conflicts during development. Clean branches. Parallel work without stepping on each other's toes.
    link: /06-integration
    linkText: See Integration

  - icon: 🗣️
    title: 5-Phase Planning Dialogue
    details: Structured human-AI collaboration — Clarify → Scope → Decompose → Validate → Approve. Never start coding without a clear plan.
    link: /03-planning
    linkText: Learn Planning

  - icon: 📡
    title: Signal Protocol
    details: Agents communicate via structured signals — COMPLETE, BLOCKED, PENDING, PROGRESS, DISCOVERY. Parse-able, actionable, automatable.
    link: /05-agents#signals
    linkText: View Signals

  - icon: 💡
    title: Discovery System
    details: Learnings are first-class citizens. Local discoveries stay with the agent, global discoveries propagate to all. Knowledge compounds.
    link: /08-discovery
    linkText: Discover More

  - icon: 🔄
    title: Checkpoint & Rollback
    details: Snapshot state at any point. Rollback to any checkpoint. Automatic checkpoints before risky operations. Never lose progress.
    link: /09-intervention
    linkText: See Recovery

  - icon: 🚦
    title: Smart Merge Queue
    details: Three-level conflict classification — Simple (auto), Medium (AI-assisted), Complex (human). Automatic rebase retry on conflicts.
    link: /06-integration
    linkText: Integration Details

  - icon: ⚡
    title: Execution Loop
    details: Continuous task execution with verification gates. Stuck detection. Automatic retry. Progress tracking per iteration.
    link: /07-execution
    linkText: Execution Flow

  - icon: 🏃
    title: Sprint Planning
    details: Define targets — run N tasks, work for N hours, or until specific time. Batch review. Sprint statistics and analytics.
    link: /07-execution#sprint-planning
    linkText: Sprint Config

  - icon: 🎛️
    title: Semi-auto & Autopilot
    details: Start with human-in-the-loop semi-auto mode. Graduate to fully autonomous autopilot when ready. Toggle anytime.
    link: /02-modes
    linkText: Operating Modes

  - icon: 🔌
    title: Lifecycle Hooks
    details: Extend AXIOM without modifying core — pre-start, post-complete, on-conflict, on-discovery. Shell scripts receive rich context via env vars.
    link: /12-hooks
    linkText: Hook System
---
