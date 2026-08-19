# Authorization and Permissions — Requirements

**Status**: Approved, not yet built
**Design**: [design.md](./design.md)
**Full spec**: [`docs/superpowers/specs/2026-08-19-authorization-design.md`](../../superpowers/specs/2026-08-19-authorization-design.md)

## The problem

Right now, everyone in a LiveFlows workspace can edit everything.

If you invite a teammate to your organization, they immediately get full write access to every project, every folder, and every diagram in it. There is no way to let someone look at a diagram without letting them change it, and no way to keep a project private from the rest of the team.

That was fine when LiveFlows was a tool for one person. It is not fine now that it is sold to a team, where "let the client review this diagram, but don't let them move things around" is a completely ordinary request.

## What we are building

Three roles on each project, and a way to make a project private.

| Role | What they can do |
|---|---|
| **Owner** | Everything, including deleting the project and managing who else is on it |
| **Editor** | Create, edit, rename, move, and delete diagrams, documents, and folders |
| **Viewer** | Open and read everything, change nothing |

Folders and files follow their project. If you are an editor on a project, you can edit everything inside it. There are no separate permissions on individual files or folders — that keeps things predictable, and it is the thing people get confused by in other tools.

## How access works

**Projects are visible to your whole team by default.** Create a project and everyone in your organization can open and edit it, exactly like today. Nothing changes for anyone until you decide it should.

**You can make a project private.** A private project is only visible to people explicitly added to it. It does not show up in anyone else's project list, search, or command palette. As far as they are concerned, it does not exist.

**You can change one person's role on a project.** Give someone owner so they can manage members, or drop someone to viewer so they can read but not edit — even on a project the rest of the team can edit normally.

**Organization admins can always get in.** An admin of your Clerk organization has owner access to every project, including private ones. This is deliberate: without it, a private project whose only owner leaves the company becomes permanently locked, with no way to fix it inside the app. Admins can already delete the entire organization through Clerk, so this does not hand them power they lacked.

## What people will notice

**A viewer opening a diagram** sees it in read-only mode with a clear indication of why, rather than a canvas where the tools quietly do nothing. Same for documents.

**A viewer** does not see buttons for creating, renaming, moving, or deleting anything. Those are hidden, not greyed out — there is no point showing someone a delete button they can never use.

**An editor** sees everything a viewer sees plus the full editing toolset, but no "manage members" or "delete project" options.

**Someone without access to a private project** who is sent a direct link to it gets a "not found" page. Not "access denied" — we do not confirm the project exists, because the name alone can leak something.

**Everyone else** sees no change at all. This is important: the day this ships, every existing person keeps exactly the access they have now.

## Rules that cannot be broken

These are the non-negotiables. Everything else is a preference.

1. **The server decides, always.** Hiding a button is a courtesy to the user, never the thing that stops them. Anyone can modify what runs in their browser.
2. **Realtime editing follows the same rules.** A viewer connected to a live diagram cannot write to it, even with a hand-crafted client. The read-only limit is enforced at the connection, not in the interface.
3. **AI agents get no special treatment.** Anything connecting through MCP is bounded by the permissions of the person whose token it uses. An agent cannot reach a project its owner cannot reach.
4. **Restricted things stay invisible.** A project you cannot access is filtered out on the server before the response is sent. Your browser never receives it and then hides it.
5. **We never confirm what you cannot see.** Requesting something you lack access to returns "not found," never "forbidden."

## What this does not include

Deliberately out of scope, so nobody expects them:

- **Permissions on individual files or folders.** Everything inherits from its project. If a project needs a locked-down subfolder, that is a later feature.
- **Custom roles.** Owner, editor, viewer. You cannot invent a fourth or adjust what the three can do.
- **Teams or groups.** Roles are assigned per person, not to a group of people.
- **Guests or public sharing.** No public links, no external viewers. Everyone must be in your Clerk organization.
- **Audit logs.** Nothing records who accessed what, including admin access to private projects.

## The gap to know about

**There is no interface for managing project members in this release.**

Everything above is enforced, but adding someone to a project, changing a role, or making a project private all require direct database access until a follow-up ships. That means private projects are not usable as a product feature yet.

This is a deliberate trade. It lets the permission system land safely and completely, without the release also depending on invitation flows, role-change interfaces, and the edge cases those bring. Every default path — the way the product works today — keeps working untouched.

## How we will know it works

- The day it ships, nobody's access changes. Confirmed against a copy of real data before deploying.
- A viewer cannot modify a diagram, including by editing what their browser sends.
- A private project is genuinely absent from the project list for someone not on it, verified in the server response and not just the interface.
- Following a direct link to a project you cannot access gives "not found."
- An organization admin can reach a private project they were never added to.
- An MCP agent cannot read or write a private project its token holder is not on.
