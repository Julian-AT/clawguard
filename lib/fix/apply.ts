import type { Sandbox } from "@vercel/sandbox";
import type { Finding } from "@/lib/analysis/types";
import type { ApplyResult } from "@/lib/fix/types";
import { runValidation } from "@/lib/fix/validate";

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/** Line-by-line fuzzy replace when exact `fix.before` substring is not in file. */
function fuzzyReplace(content: string, search: string, replacement: string): string | null {
  const contentLines = content.split("\n");
  const searchLines = search
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((l) => l.trim());

  if (searchLines.length === 0) return null;

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let match = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trim() !== searchLines[j]) {
        match = false;
        break;
      }
    }

    if (match) {
      const leadingWhitespace = contentLines[i].match(/^(\s*)/)?.[1] ?? "";
      const replacementLines = replacement.replace(/\r\n/g, "\n").trim().split("\n");
      const indentedReplacement = replacementLines
        .map((line) => leadingWhitespace + line.trim())
        .join("\n");

      const before = contentLines.slice(0, i);
      const after = contentLines.slice(i + searchLines.length);
      return [...before, indentedReplacement, ...after].join("\n");
    }
  }

  return null;
}

export async function applyStoredFix(sandbox: Sandbox, finding: Finding): Promise<ApplyResult> {
  const filePath = finding.file;

  if (!finding.fix) {
    return {
      valid: false,
      content: "",
      errors: "No stored fix available for this finding",
    };
  }

  const originalBuffer = await sandbox.readFileToBuffer({ path: filePath });
  const originalContent = originalBuffer?.toString("utf-8") ?? "";

  const normalizedContent = normalizeLineEndings(originalContent);
  const normalizedBefore = normalizeLineEndings(finding.fix.before);
  const normalizedAfter = normalizeLineEndings(finding.fix.after);

  let fixedContent: string;

  if (normalizedContent.includes(normalizedBefore)) {
    fixedContent = normalizedContent.replace(normalizedBefore, normalizedAfter);
  } else {
    const fuzzyResult = fuzzyReplace(
      normalizeLineEndings(originalContent),
      finding.fix.before,
      finding.fix.after,
    );

    if (fuzzyResult === null) {
      return {
        valid: false,
        content: originalContent,
        errors: "fix.before pattern not found in file",
      };
    }

    fixedContent = fuzzyResult;
  }

  if (fixedContent === normalizedContent) {
    return {
      valid: false,
      content: originalContent,
      errors: "fix.before pattern not found in file",
    };
  }

  await sandbox.writeFiles([{ path: filePath, content: Buffer.from(fixedContent) }]);

  const validation = await runValidation(sandbox);

  if (!validation.passed) {
    await sandbox.writeFiles([{ path: filePath, content: Buffer.from(originalContent) }]);

    return {
      valid: false,
      content: fixedContent,
      errors: validation.errors,
    };
  }

  return {
    valid: true,
    content: fixedContent,
    errors: "",
  };
}
