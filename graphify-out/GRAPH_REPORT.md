# Graph Report - .  (2026-08-09)

## Corpus Check
- 280 files · ~287,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1967 nodes · 2486 edges · 145 communities (96 shown, 49 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Prisma Internal Namespace
- Workspace Member Model
- Project Model
- Workspace Model
- Canvas Snapshot Model
- User Model
- Design Token Colors
- Processed Webhook Model
- CIP Design Scripts
- UI/UX Pro Max Scripts
- Slide Search System
- Biome Linter Config
- Design Token Spacing
- UI Styling Tests
- TypeScript References
- HTML Token Validator
- Prisma Common Input Types
- Package Dependencies
- Logo Design Scripts
- App Layout & Navigation
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 57 edges
2. `TestTailwindConfigGenerator` - 35 edges
3. `ShadcnInstaller` - 33 edges
4. `DesignSystemGenerator` - 27 edges
5. `TestShadcnInstaller` - 26 edges
6. `CanvasSnapshotDelegate` - 18 edges
7. `ProcessedWebhookDelegate` - 18 edges
8. `ProjectDelegate` - 18 edges
9. `UserDelegate` - 18 edges
10. `WorkspaceDelegate` - 18 edges

## Surprising Connections (you probably didn't know these)
- `TestDomainDetection` --uses--> `BM25`  [INFERRED]
  .kiro/steering/ui-ux-pro-max/scripts/tests/test_core.py → .kiro/steering/design/scripts/cip/core.py
- `TestPersistence` --uses--> `BM25`  [INFERRED]
  .kiro/steering/ui-ux-pro-max/scripts/tests/test_core.py → .kiro/steering/design/scripts/cip/core.py
- `TestReasoningMatch` --uses--> `BM25`  [INFERRED]
  .kiro/steering/ui-ux-pro-max/scripts/tests/test_core.py → .kiro/steering/design/scripts/cip/core.py
- `TestSearchDomains` --uses--> `BM25`  [INFERRED]
  .kiro/steering/ui-ux-pro-max/scripts/tests/test_core.py → .kiro/steering/design/scripts/cip/core.py
- `TestTokenizer` --uses--> `BM25`  [INFERRED]
  .kiro/steering/ui-ux-pro-max/scripts/tests/test_core.py → .kiro/steering/design/scripts/cip/core.py

## Import Cycles
- 3-file cycle: `src/generated/prisma/commonInputTypes.ts -> src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/commonInputTypes.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/CanvasSnapshot.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/ProcessedWebhook.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/Project.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/User.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/Workspace.ts -> src/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/generated/prisma/internal/prismaNamespace.ts -> src/generated/prisma/models.ts -> src/generated/prisma/models/WorkspaceMember.ts -> src/generated/prisma/internal/prismaNamespace.ts`

## Communities (145 total, 49 thin omitted)

### Community 0 - "Prisma Internal Namespace"
Cohesion: 0.02
Nodes (110): Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean, Bytes (+102 more)

### Community 1 - "Workspace Member Model"
Cohesion: 0.02
Nodes (89): AggregateWorkspaceMember, GetWorkspaceMemberAggregateType, GetWorkspaceMemberGroupByPayload, WorkspaceMemberAggregateArgs, WorkspaceMemberCountAggregateInputType, WorkspaceMemberCountAggregateOutputType, WorkspaceMemberCountArgs, WorkspaceMemberCountOrderByAggregateInput (+81 more)

### Community 2 - "Project Model"
Cohesion: 0.02
Nodes (84): AggregateProject, GetProjectAggregateType, GetProjectGroupByPayload, Project$canvasArgs, ProjectAggregateArgs, ProjectCountAggregateInputType, ProjectCountAggregateOutputType, ProjectCountArgs (+76 more)

### Community 3 - "Workspace Model"
Cohesion: 0.02
Nodes (81): AggregateWorkspace, GetWorkspaceAggregateType, GetWorkspaceGroupByPayload, Workspace$membersArgs, Workspace$projectsArgs, WorkspaceAggregateArgs, WorkspaceCountAggregateInputType, WorkspaceCountAggregateOutputType (+73 more)

### Community 4 - "Canvas Snapshot Model"
Cohesion: 0.03
Nodes (74): AggregateCanvasSnapshot, CanvasSnapshotAggregateArgs, CanvasSnapshotAvgAggregateInputType, CanvasSnapshotAvgAggregateOutputType, CanvasSnapshotAvgOrderByAggregateInput, CanvasSnapshotCountAggregateInputType, CanvasSnapshotCountAggregateOutputType, CanvasSnapshotCountArgs (+66 more)

### Community 5 - "User Model"
Cohesion: 0.03
Nodes (73): AggregateUser, DateTimeFieldUpdateOperationsInput, GetUserAggregateType, GetUserGroupByPayload, NullableStringFieldUpdateOperationsInput, StringFieldUpdateOperationsInput, User$membershipsArgs, UserAggregateArgs (+65 more)

### Community 6 - "Design Token Colors"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "Processed Webhook Model"
Cohesion: 0.04
Nodes (52): AggregateProcessedWebhook, GetProcessedWebhookAggregateType, GetProcessedWebhookGroupByPayload, ProcessedWebhookAggregateArgs, ProcessedWebhookCountAggregateInputType, ProcessedWebhookCountAggregateOutputType, ProcessedWebhookCountArgs, ProcessedWebhookCountOrderByAggregateInput (+44 more)

### Community 8 - "CIP Design Scripts"
Cohesion: 0.06
Nodes (42): BM25, detect_domain(), get_cip_brief(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection (+34 more)

### Community 9 - "UI/UX Pro Max Scripts"
Cohesion: 0.07
Nodes (28): BM25, detect_domain(), _domain_keywords(), _get_bm25(), _load_csv(), _load_product_keywords(), _normalize(), Apply synonym substitution before tokenizing. (+20 more)

### Community 10 - "Slide Search System"
Cohesion: 0.08
Nodes (36): format_context(), format_result(), main(), Format a single search result for display, Format contextual recommendations for display., BM25, calculate_pattern_break(), detect_domain() (+28 more)

### Community 11 - "Biome Linter Config"
Cohesion: 0.05
Nodes (37): source, assist, actions, css, parser, next, react, files (+29 more)

### Community 12 - "Design Token Spacing"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 13 - "UI Styling Tests"
Cohesion: 0.07
Nodes (15): Test adding colors multiple times., Test adding custom breakpoints., Test TailwindConfigGenerator class., Test generating TypeScript configuration., Test generating JavaScript configuration., Test generating config with custom colors., Test generating config with plugins., Test validating valid configuration. (+7 more)

### Community 14 - "TypeScript References"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, **/*.ts (+20 more)

### Community 15 - "HTML Token Validator"
Cohesion: 0.14
Nodes (24): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+16 more)

### Community 16 - "Prisma Common Input Types"
Cohesion: 0.08
Nodes (25): DateTimeFilter, DateTimeWithAggregatesFilter, IntFilter, IntWithAggregatesFilter, JsonFilter, JsonFilterBase, JsonWithAggregatesFilter, JsonWithAggregatesFilterBase (+17 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.08
Nodes (25): @clerk/nextjs, @excalidraw/excalidraw, @liveblocks/client, @liveblocks/node, @liveblocks/react, next, dependencies, @clerk/nextjs (+17 more)

### Community 18 - "Logo Design Scripts"
Cohesion: 0.11
Nodes (19): BM25, detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+11 more)

### Community 19 - "App Layout & Navigation"
Cohesion: 0.18
Nodes (11): AppLayout(), AppNav(), CreateProjectModal(), DeleteProjectDialog(), formatDate(), ProjectList(), mockProjects, ProjectListItem (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (12): DesignSystemGenerator, Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., Execute searches across multiple domains., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict. (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (21): babel-plugin-react-compiler, @biomejs/biome, @clerk/testing, devDependencies, babel-plugin-react-compiler, @biomejs/biome, @clerk/testing, prisma (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (20): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), hex_to_ansi(), persist_design_system() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (19): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (11): Generate Tailwind CSS configuration files., Add full color palette (50-950 shades) for a base color.          Args:, TailwindConfigGenerator, Test adding full color palette., Test adding custom spacing., Test plugin recommendations for Next.js., Test validating config with no content paths., Test writing configuration to file. (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (19): $type, $value, background, destructive, foreground, muted-foreground, primary-hover, secondary (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (17): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): POST(), NotFoundError, UnauthorizedError, ProjectDetail, ProjectWithSnapshot, mockAuth, mockUpsert, requireWorkspaceByOrgId() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.26
Nodes (12): createProjectAction(), deleteProjectAction(), mockCreateProject, mockRedirect, mockRevalidatePath, createProject(), deleteProject(), decommissionRoom() (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (15): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (9): Test adding components without shadcn config., Test adding components that are already installed., Test ShadcnInstaller class., Test adding all components in dry run mode., Create temporary project structure., Test successful addition of all components., Test listing installed components when none exist., Test checking for non-existent shadcn config. (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (7): _palette_is_dark(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., _relative_luminance(), The exact reproduction from issue #428., TestEndToEndCoherence, TestLuminance

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (14): CanvasSnapshotScalarFieldEnum, JsonNullValueFilter, JsonNullValueInput, ModelName, NullsOrder, NullTypes, ProcessedWebhookScalarFieldEnum, ProjectScalarFieldEnum (+6 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (8): main(), Add custom font families.          Args:             fonts: Dict of font_type: [, Add custom spacing values.          Args:             spacing: Dict of name: val, Add custom breakpoints.          Args:             breakpoints: Dict of name: wi, Add plugin requirements.          Args:             plugins: List of plugin name, Get plugin recommendations based on configuration.          Returns:, Validate configuration.          Returns:             Tuple of (valid, message), Add custom colors to theme.          Args:             colors: Dict of color_nam

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (10): Canvas(), CanvasRoom(), CanvasRoomProps, CAPTURE_NEVER, client, Excalidraw, { RoomProvider, useMutation, useStorage, useOthers, useStatus }, collectLocalChanges() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (7): main(), Add all available shadcn/ui components.          Args:             overwrite: If, List installed components.          Returns:             Tuple of (success, mess, Check if shadcn is initialized in project.          Returns:             True if, Get list of already installed components.          Returns:             List of, Read shadcn version from project package.json; fall back to a pinned default., Add shadcn/ui components.          Args:             components: List of compone

### Community 47 - "Community 47"
Cohesion: 0.30
Nodes (7): test, assertNotStubbed(), signInAsUser(), STORAGE_DIR, storagePathFor(), blockLiveblocks(), unblockLiveblocks()

### Community 48 - "Community 48"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (7): Handle shadcn/ui component installation., ShadcnInstaller, Test component addition with subprocess error., Test listing installed components when they exist., Test initialization with custom project root., Test checking for existing shadcn config., Test getting installed components without config.

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (6): Generate configuration file content.          Returns:             Configuration, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config.          Validates each plugin name against a s, Add indentation to JSON string., Write configuration to file.          Returns:             Tuple of (success, me

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (9): POST(), mockMemberDelete, mockMemberUpsert, mockProcessedCreate, mockUserDelete, mockUserUpsert, mockVerify, mockWsFindUnique (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.18
Nodes (9): CanvasSnapshot, $Enums, PrismaClient, ProcessedWebhook, Project, User, Workspace, WorkspaceMember (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (10): getProject(), mockAuth, mockCreate, mockDecommissionRoom, mockDelete, mockFindFirst, mockFindMany, mockProvisionRoom (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (9): args, extractTokens(), fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath (+1 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (7): Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be     han, Regression guard for the missing-comma bug between the ``theme`` block and     `, The property preceding ``plugins`` must end with a comma (pure-Python         ch, The emitted config parses as valid JS via ``node --check``., _strip_to_object(), TestGeneratedConfigIsValidJs

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (7): _query_wants_dark(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with., _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (6): Any, Path, Initialize generator.          Args:             typescript: If True, generate ., Determine default output path., Create base configuration structure., Get default content paths for framework.

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (9): enhance_prompt(), generate_batch(), generate_logo(), load_env(), main(), Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation      Args:         asp, Generate multiple logo variants with different styles (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.24
Nodes (10): $type, $value, $type, $value, primitive, radius, shadow, full (+2 more)

### Community 65 - "Community 65"
Cohesion: 0.28
Nodes (8): CompletedProcess, Path, Regression tests for validate-tokens.cjs.  The validator used to skip any line c, A hardcoded hex on the same line as a var() token is still a violation., A line that references only tokens produces no false positives., _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (7): CanvasSnapshot, $Enums, ProcessedWebhook, Project, User, Workspace, WorkspaceMember

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (8): padding-y, input, $type, $value, focus-ring, padding-y, $type, $value

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (5): format_markdown(), generate_design_system(), Format design system as markdown., Main entry point for design system generation.      Args:         query: Search, TestPersistence

### Community 70 - "Community 70"
Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, test, test:e2e

### Community 71 - "Community 71"
Cohesion: 0.43
Nodes (3): _filter_anti_patterns_for_mode(), Drop "avoid dark mode" advice once dark mode is the resolved answer., TestAntiPatternGating

### Community 72 - "Community 72"
Cohesion: 0.43
Nodes (3): Pick the highest-ranked palette matching the resolved mode.      Only the dark c, _select_palette_for_mode(), TestPaletteSelection

### Community 73 - "Community 73"
Cohesion: 0.48
Nodes (5): Page(), WorkspacePage(), getProjectWithSnapshot(), listProjects(), requireWorkspace()

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (3): matchers, publicPatterns, NOTE: We test the regex patterns directly rather than invoking

### Community 78 - "Community 78"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 79 - "Community 79"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 80 - "Community 80"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 81 - "Community 81"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (4): padding-x, padding-x, $type, $value

### Community 86 - "Community 86"
Cohesion: 0.67
Nodes (4): $type, $value, default, default

### Community 87 - "Community 87"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 89 - "Community 89"
Cohesion: 0.83
Nodes (3): _check_file(), main(), _read_rows()

### Community 95 - "Community 95"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (3): primary, $type, $value

### Community 98 - "Community 98"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 99 - "Community 99"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 100 - "Community 100"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 104 - "Community 104"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

## Knowledge Gaps
- **866 isolated node(s):** `fs`, `path`, `fs`, `path`, `fs` (+861 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `primitive` connect `Community 64` to `Community 37`, `Design Token Colors`, `Design Token Spacing`, `Community 45`, `Community 63`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `ProcessedWebhookDelegate` connect `Community 30` to `Processed Webhook Model`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `WorkspaceDelegate` connect `Community 33` to `Workspace Model`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 36 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `.test_node_check_parses_generated_config()`) actually correct?**
  _`TailwindConfigGenerator` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 23 inferred relationships involving `ShadcnInstaller` (e.g. with `TestShadcnInstaller` and `.test_add_all_components_dry_run()`) actually correct?**
  _`ShadcnInstaller` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestDomainDetection` and `TestPersistence`) actually correct?**
  _`DesignSystemGenerator` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `fs` to the rest of the system?**
  _866 weakly-connected nodes found - possible documentation gaps or missing edges._