# Changelog Generation Instructions

## Goal
Analyze the provided Git commit messages and generate two separate changelogs in Markdown format: one for end-users and one for developers.

## Input
You will receive a list of commit messages since the last release tag. Assume these commits follow the Conventional Commits specification (e.g., `feat: ...`, `fix: ...`, `refactor: ...`, etc.).

## Output Format
**CRITICAL:** Structure your response *exactly* as follows, using these precise code fence markers. Do not add any commentary outside of these blocks. Place the relevant changelog content **only** within these fences:

```USER_CHANGELOG
### User Changelog

[Place User Changelog Content Here]
```

```DEV_CHANGELOG
### Developer Changelog

[Place Developer Changelog Content Here]
```

## Content Guidelines

### User Changelog (`USER_CHANGELOG`)
- Focus on changes directly impacting end-users.
- Primarily include commits marked as `feat` (New Features) and `fix` (Bug Fixes). You can also consider `perf` (Performance Improvements) if they are user-noticeable.
- Use clear, non-technical language.
- Group related changes under appropriate headings (e.g., ✨ Features, 🐛 Bug Fixes).
- Omit internal changes, refactoring, documentation updates, tests, chores, etc.
- Example Entry: `- Improved loading speed for the main map view.`

### Developer Changelog (`DEV_CHANGELOG`)
- Include all significant changes relevant to developers.
- Group commits by their Conventional Commit type (e.g., `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`, `chore`).
- Include the commit scope if present (e.g., `fix(auth): ...`).
- You can include the commit hash briefly if helpful, but focus on the message summary.
- Example Entry (under `refactor`): `- (map): Simplified state management for map layers (a1b2c3d)`

Please generate the content for both changelogs based **only** on the provided commit messages and adhere **strictly** to the output format specified above using the ` ```USER_CHANGELOG` and ` ```DEV_CHANGELOG` markers. 