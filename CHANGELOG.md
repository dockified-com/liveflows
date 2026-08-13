# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Tab reordering using drag and drop for workspace tabs (supports mouse dragging and full keyboard navigation)
- Collaboration support for document editing with Tiptap and Liveblocks
- Visual connection status indicator and offline banner across document and canvas views

### Fixed
- Tab dragging animation lag by scoping CSS transitions to colors instead of all layout properties
- Canvas element loss on page navigate by flushing pending edits during unmount cleanup
- Accessibility tree navigation for file trees, tab bars, and modal dialogs

### Changed
- Developer setup documentation and linter ignore patterns to improve onboarding and build speed
