import React from "react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";
import { InlineError } from "./inline-error";
import { Input } from "./input";
import { ModalDialog } from "./modal-dialog";
import { StatusPill } from "./status-pill";

export const PrimitivesDemo: React.FC = () => {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="p-8 space-y-6 max-w-2xl bg-[var(--bg)]">
      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">Buttons</h2>
        <div className="flex gap-2">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">
          Status Pills
        </h2>
        <div className="flex gap-2">
          <StatusPill status="synced" />
          <StatusPill status="reconnecting" />
          <StatusPill status="disconnected" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">Icons</h2>
        <div className="flex gap-3 text-[var(--ink-soft)]">
          <Icon label="Home Icon">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </Icon>
          <Icon active label="Active Folder">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </Icon>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">Input</h2>
        <Input label="Project Name" placeholder="e.g. Checkout Redesign" />
        <Input label="With Error" error="Name is required" defaultValue="" />
      </section>

      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">
          Inline Error
        </h2>
        <InlineError message="Failed to reach Liveblocks realtime server." />
      </section>

      <section className="space-y-2">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">
          Empty State
        </h2>
        <EmptyState
          title="No projects found"
          description="Create your first architecture diagram project to get started."
          action={<Button variant="primary">+ Create Project</Button>}
        />
      </section>

      <section className="space-y-2">
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <ModalDialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create New Project"
          description="Projects hold architecture diagrams and technical specs."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary">Create</Button>
            </>
          }
        >
          <Input label="Project Name" placeholder="My System Architecture" />
        </ModalDialog>
      </section>
    </div>
  );
};
