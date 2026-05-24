# AI System Export

This directory contains a consolidated, deterministic export of the structural and architectural information for the integrated AI systems used in this project.

## Purpose

The goal of this export is to provide a single, implementation-ready source of truth for the capabilities, rules, memories, and workflows of the AI agents (Gemini, Claude, Copilot) involved in this workspace. It is designed for cross-platform consolidation, analysis, and future system integration.

## Structure

The directory is organized by function, with each subdirectory containing markdown files specific to a particular AI platform:

-   **/SYSTEM**: Core identity, architecture, and operational principles.
-   **/MEMORY**: Stable, long-term memory and context.
-   **/SKILLS**: Reusable, named capabilities and instruction sets.
-   **/AGENTS**: Definitions of specialized agent personas.
-   **/HOOKS**: Entry points and triggers for automated processes.
-   **/PLUGINS**: External tool integrations.
-   **/CONNECTORS**: Data source and API connection specifications.
-   **/WORKFLOWS**: Standard operating procedures and multi-step task execution flows.
-   **/PROMPTS**: Core prompts and prompt templates.
-   **/RULES**: Global, safety, and operational rules that govern behavior.
-   **/CAPABILITIES**: Verified lists of available tools and inherent abilities.
-   **/LIMITATIONS**: Known constraints and operational boundaries.

## Usage

This export is intended to be committed to a Git repository to track the evolution of the AI systems' architecture. All information is presented in a deterministic, modular format, excluding volatile session state.
