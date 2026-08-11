import { TaskInstruction } from "./types";

export interface BuildContext {
  instruction: TaskInstruction;
  agentsMdContent: string | null;
  fileContents: Map<string, string>;
  missingFiles: string[];
  directoryTree: string | null;
  maxContextBytes: number;
}

export function validateInstruction(instruction: TaskInstruction): { valid: boolean; error?: string } {
  if (!instruction.description || instruction.description.trim() === "") {
    return { valid: false, error: "Missing or empty mandatory field: description" };
  }
  if (!instruction.contextFiles || instruction.contextFiles.length === 0 || instruction.contextFiles.some(f => !f || f.trim() === "")) {
    return { valid: false, error: "Missing, empty, or invalid mandatory field: contextFiles" };
  }
  if (!instruction.constraints || instruction.constraints.length === 0 || instruction.constraints.some(c => !c || c.trim() === "")) {
    return { valid: false, error: "Missing, empty, or invalid mandatory field: constraints" };
  }
  if (!instruction.permittedFiles || instruction.permittedFiles.length === 0 || instruction.permittedFiles.some(f => !f || f.trim() === "")) {
    return { valid: false, error: "Missing, empty, or invalid mandatory field: permittedFiles" };
  }
  if (instruction.permittedFiles.length > 50) {
    return { valid: false, error: "permittedFiles count is out of bounds (1-50)" };
  }
  if (!instruction.expectedOutput || instruction.expectedOutput.trim() === "") {
    return { valid: false, error: "Missing or empty mandatory field: expectedOutput" };
  }
  return { valid: true };
}

const CREATION_TASK_REGEX = /\b(create|new|generate|build|add|make|scaffold)\b/i;

export function isCreationTask(description: string): boolean {
  return CREATION_TASK_REGEX.test(description);
}

export function buildInstructionText(ctx: BuildContext): string {
  let contextBudget = ctx.maxContextBytes;
  
  let projectConventions = "";
  if (ctx.agentsMdContent) {
    const header = `## Project Conventions\n`;
    const headerBytes = Buffer.byteLength(header, "utf8");
    const contentBytes = Buffer.byteLength(ctx.agentsMdContent, "utf8");
    
    if (headerBytes + contentBytes > contextBudget) {
      const allowed = Math.max(0, contextBudget - headerBytes);
      const buf = Buffer.from(ctx.agentsMdContent, "utf8");
      const truncated = buf.subarray(0, allowed).toString("utf8").replace(/\uFFFD/g, "");
      projectConventions = header + truncated + "\n\n";
      contextBudget -= (headerBytes + Buffer.byteLength(truncated, "utf8"));
    } else {
      projectConventions = header + ctx.agentsMdContent + "\n\n";
      contextBudget -= (headerBytes + contentBytes);
    }
  }

  let filePathsContext = "";
  const fpHeader = `## File Paths\n`;
  filePathsContext += fpHeader;
  
  for (const filePath of ctx.instruction.contextFiles) {
    if (contextBudget <= 0) break;

    if (ctx.missingFiles.includes(filePath)) {
      const missingNote = `### ${filePath}\n[File not found]\n`;
      const missingBytes = Buffer.byteLength(missingNote, "utf8");
      if (contextBudget >= missingBytes) {
         filePathsContext += missingNote;
         contextBudget -= missingBytes;
      } else {
         contextBudget = 0;
         break;
      }
      continue;
    }
    
    const content = ctx.fileContents.get(filePath);
    if (content !== undefined) {
      const fileHeader = `### ${filePath}\n`;
      const headerBytes = Buffer.byteLength(fileHeader, "utf8");
      const contentBytes = Buffer.byteLength(content, "utf8");
      
      if (contextBudget >= headerBytes + contentBytes) {
        filePathsContext += fileHeader + content + "\n";
        contextBudget -= (headerBytes + contentBytes);
      } else if (contextBudget > headerBytes) {
        const allowed = contextBudget - headerBytes;
        const buf = Buffer.from(content, "utf8");
        const truncated = buf.subarray(0, allowed).toString("utf8").replace(/\uFFFD/g, "");
        filePathsContext += fileHeader + truncated + "\n";
        contextBudget -= (headerBytes + Buffer.byteLength(truncated, "utf8"));
        contextBudget = 0;
        break;
      } else {
        contextBudget = 0;
        break;
      }
    }
  }
  filePathsContext += "\n";

  let directoryTreeStr = "";
  if (ctx.directoryTree && contextBudget > 0) {
     const dtHeader = `## Directory Structure\n`;
     const dtHeaderBytes = Buffer.byteLength(dtHeader, "utf8");
     const dtContentBytes = Buffer.byteLength(ctx.directoryTree, "utf8");
     
     if (contextBudget >= dtHeaderBytes + dtContentBytes) {
       directoryTreeStr = dtHeader + ctx.directoryTree + "\n\n";
       contextBudget -= (dtHeaderBytes + dtContentBytes);
     } else if (contextBudget > dtHeaderBytes) {
       const allowed = contextBudget - dtHeaderBytes;
       const buf = Buffer.from(ctx.directoryTree, "utf8");
       const truncated = buf.subarray(0, allowed).toString("utf8").replace(/\uFFFD/g, "");
       directoryTreeStr = dtHeader + truncated + "\n\n";
       contextBudget -= (dtHeaderBytes + Buffer.byteLength(truncated, "utf8"));
     }
  }
  
  const desc = `## Task Description\n${ctx.instruction.description}\n\n`;
  const constraints = `## Constraints\n${ctx.instruction.constraints.map(c => `- ${c}`).join("\n")}\n\n`;
  const permitted = `## Permitted Files\n${ctx.instruction.permittedFiles.map(f => `- ${f}`).join("\n")}\n\n`;
  const expected = `## Expected Output\n${ctx.instruction.expectedOutput}\n\n`;
  
  return projectConventions + desc + filePathsContext + constraints + permitted + expected + directoryTreeStr;
}
