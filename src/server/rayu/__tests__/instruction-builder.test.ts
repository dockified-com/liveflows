import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { buildInstructionText, validateInstruction, isCreationTask, BuildContext } from "../instruction-builder";
import { TaskInstruction } from "../types";

describe("instruction-builder.ts", () => {
  const nonEmptyString = fc.string({ minLength: 1 }).filter(s => s.trim() !== "");
  const arbitraryInstruction = fc.record({
    description: nonEmptyString,
    contextFiles: fc.array(nonEmptyString, { minLength: 1 }),
    constraints: fc.array(nonEmptyString, { minLength: 1 }),
    permittedFiles: fc.array(nonEmptyString, { minLength: 1, maxLength: 50 }),
    expectedOutput: nonEmptyString,
  });

  describe("Property 1: Instruction formatting produces all mandatory sections", () => {
    it("should contain exactly the five mandatory section headers exactly once", () => {
      fc.assert(
        fc.property(arbitraryInstruction, (instruction) => {
          const ctx: BuildContext = {
            instruction: instruction as TaskInstruction,
            agentsMdContent: null,
            fileContents: new Map(),
            missingFiles: [],
            directoryTree: null,
            maxContextBytes: 1024 * 1024,
          };
          const output = buildInstructionText(ctx);
          
          const headers = [
            "## Task Description",
            "## File Paths",
            "## Constraints",
            "## Permitted Files",
            "## Expected Output"
          ];
          
          for (const header of headers) {
            const matches = output.match(new RegExp(`^${header}$`, "gm"));
            expect(matches).not.toBeNull();
            expect(matches?.length).toBe(1);
          }
        })
      );
    });
  });

  describe("Property 2: Instruction validation rejects incomplete instructions", () => {
    it("should reject if any mandatory field is missing", () => {
      const fields = ["description", "contextFiles", "constraints", "permittedFiles", "expectedOutput"];
      
      fc.assert(
        fc.property(arbitraryInstruction, fc.constantFrom(...fields), (instruction, fieldToEmpty) => {
          const badInstruction = { ...instruction };
          if (Array.isArray((badInstruction as any)[fieldToEmpty])) {
            (badInstruction as any)[fieldToEmpty] = [];
          } else {
            (badInstruction as any)[fieldToEmpty] = "";
          }
          
          const result = validateInstruction(badInstruction as TaskInstruction);
          expect(result.valid).toBe(false);
          expect(result.error).toContain(fieldToEmpty);
        })
      );
    });
  });

  describe("Property 3: Permitted files count is bounded", () => {
    it("should reject 0 and >50 permitted files", () => {
      fc.assert(
        fc.property(arbitraryInstruction, fc.array(nonEmptyString, { minLength: 51 }), (instruction, tooMany) => {
          const resultEmpty = validateInstruction({ ...instruction, permittedFiles: [] } as TaskInstruction);
          expect(resultEmpty.valid).toBe(false);
          expect(resultEmpty.error).toContain("permittedFiles");
          
          const resultTooMany = validateInstruction({ ...instruction, permittedFiles: tooMany } as TaskInstruction);
          expect(resultTooMany.valid).toBe(false);
          expect(resultTooMany.error).toContain("permittedFiles count is out of bounds");
        })
      );
    });
  });

  describe("Property 10: Context injection respects the byte budget with priority ordering", () => {
    it("total injected context never exceeds budget and respects priority", () => {
      fc.assert(
        fc.property(
          arbitraryInstruction,
          fc.string({ minLength: 10 }),
          fc.dictionary(fc.string({ minLength: 1 }), fc.string({ minLength: 10 }), { minKeys: 2, maxKeys: 5 }),
          fc.string({ minLength: 10 }),
          fc.integer({ min: 100, max: 1000 }),
          (instruction, agentsMd, filesDict, directoryTree, maxContextBytes) => {
            const fileContents = new Map(Object.entries(filesDict));
            const fileKeys = Array.from(fileContents.keys());
            const instr = { ...instruction, contextFiles: fileKeys } as TaskInstruction;

            const ctx: BuildContext = {
              instruction: instr,
              agentsMdContent: agentsMd,
              fileContents,
              missingFiles: [],
              directoryTree,
              maxContextBytes,
            };
            const output = buildInstructionText(ctx);
            expect(typeof output).toBe("string");

            // Extract sections
            const agentsStr = output.includes("## Project Conventions") 
              ? output.slice(output.indexOf("## Project Conventions"), output.indexOf("## Task Description")) 
              : "";
            
            const constraintsIndex = output.indexOf("## Constraints");
            
            const filesStr = output.slice(
              output.indexOf("## File Paths"), 
              constraintsIndex
            );
            
            const dirIndex = output.indexOf("## Directory Structure");
            const dirStr = dirIndex !== -1 
              ? output.slice(dirIndex) 
              : "";

            // The implementation doesn't count the trailing newlines added between sections,
            // nor does it count the "## File Paths\n" header and the trailing \n for the files section.
            let uncountedBytes = 0;
            if (agentsStr) uncountedBytes += 2; // \n\n
            if (dirStr) uncountedBytes += 2; // \n\n
            const fileMatches = filesStr.match(/### /g);
            if (fileMatches) uncountedBytes += fileMatches.length; // \n per file
            // ## File Paths\n (14 bytes) + trailing \n (1 byte) = 15 bytes not counted in budget
            uncountedBytes += Buffer.byteLength("## File Paths\n\n", "utf8");
            
            const injectedBytes = Buffer.byteLength(agentsStr, "utf8") + 
                                  Buffer.byteLength(filesStr, "utf8") + 
                                  Buffer.byteLength(dirStr, "utf8") - 
                                  uncountedBytes;
                                  
            expect(injectedBytes).toBeLessThanOrEqual(maxContextBytes);

            // Assert priority ordering
            if (Buffer.byteLength("## Project Conventions\n", "utf8") > maxContextBytes) {
                expect(agentsStr).toBe("");
                expect(filesStr).toBe("## File Paths\n\n");
                expect(dirStr).toBe("");
            } else if (injectedBytes >= maxContextBytes - 10) {
               // If budget is exhausted, directory tree should be omitted if files didn't all fit
               const lastFileHeader = `### ${fileKeys[fileKeys.length - 1]}\n`;
               if (!filesStr.includes(lastFileHeader)) {
                   expect(dirStr).toBe("");
               }
            }
          }
        )
      );
    });
  });

  describe("Unit tests", () => {
    it("detects creation task", () => {
      expect(isCreationTask("create a new module")).toBe(true);
      expect(isCreationTask("generate a new component")).toBe(true);
      expect(isCreationTask("build the system")).toBe(true);
      expect(isCreationTask("add a new route")).toBe(true);
      expect(isCreationTask("Update the file")).toBe(false);
      expect(isCreationTask("fix the bug")).toBe(false);
    });
    
    it("handles missing files notes in context", () => {
       const ctx: BuildContext = {
          instruction: {
             description: "x",
             contextFiles: ["missing.ts", "exists.ts"],
             constraints: ["x"],
             permittedFiles: ["x"],
             expectedOutput: "x"
          },
          agentsMdContent: null,
          fileContents: new Map([["exists.ts", "content"]]),
          missingFiles: ["missing.ts"],
          directoryTree: null,
          maxContextBytes: 1000,
       };
       const output = buildInstructionText(ctx);
       expect(output).toContain("### missing.ts\n[File not found]");
       expect(output).toContain("### exists.ts\ncontent");
    });

    it("includes AGENTS.md when non-null and omits when null", () => {
      const baseCtx: BuildContext = {
        instruction: {
          description: "x", contextFiles: ["x.ts"], constraints: ["x"], permittedFiles: ["x"], expectedOutput: "x"
        },
        agentsMdContent: "Some conventions",
        fileContents: new Map([["x.ts", "content"]]),
        missingFiles: [],
        directoryTree: null,
        maxContextBytes: 1000,
      };
      
      const outWithAgents = buildInstructionText(baseCtx);
      expect(outWithAgents).toContain("## Project Conventions\nSome conventions\n\n");
      
      const outWithoutAgents = buildInstructionText({ ...baseCtx, agentsMdContent: null });
      expect(outWithoutAgents).not.toContain("## Project Conventions");
    });

    it("verifies output structure formatting and header order", () => {
      const ctx: BuildContext = {
        instruction: {
          description: "Task desc", contextFiles: ["x.ts"], constraints: ["constraint1"], permittedFiles: ["file1"], expectedOutput: "out"
        },
        agentsMdContent: "Conventions",
        fileContents: new Map([["x.ts", "content"]]),
        missingFiles: [],
        directoryTree: "tree",
        maxContextBytes: 1000,
      };
      const output = buildInstructionText(ctx);
      
      const idxConventions = output.indexOf("## Project Conventions");
      const idxDesc = output.indexOf("## Task Description");
      const idxFiles = output.indexOf("## File Paths");
      const idxConstraints = output.indexOf("## Constraints");
      const idxPermitted = output.indexOf("## Permitted Files");
      const idxExpected = output.indexOf("## Expected Output");
      const idxTree = output.indexOf("## Directory Structure");
      
      expect(idxConventions).toBeLessThan(idxDesc);
      expect(idxDesc).toBeLessThan(idxFiles);
      expect(idxFiles).toBeLessThan(idxConstraints);
      expect(idxConstraints).toBeLessThan(idxPermitted);
      expect(idxPermitted).toBeLessThan(idxExpected);
      expect(idxExpected).toBeLessThan(idxTree);
    });

    it("truncates context file when it exceeds maxContextBytes", () => {
      const ctx: BuildContext = {
        instruction: {
          description: "x", contextFiles: ["x.ts"], constraints: ["x"], permittedFiles: ["x"], expectedOutput: "x"
        },
        agentsMdContent: null,
        fileContents: new Map([["x.ts", "0123456789"]]),
        missingFiles: [],
        directoryTree: null,
        // Header "### x.ts\n" is 9 bytes. Total budget 13 bytes -> allows 4 bytes of content.
        maxContextBytes: 13,
      };
      const output = buildInstructionText(ctx);
      expect(output).toContain("### x.ts\n0123\n");
      expect(output).not.toContain("456789");
    });
  });
});
