import type { Sandbox } from "@vercel/sandbox";
import type { Finding } from "@/lib/analysis/types";
import type { ApplyResult } from "@/lib/fix/types";
import { runValidation } from "@/lib/fix/validate";

/**
 * Normalize content for comparison: trim lines, normalize line endings.
 */
function normalizeContent(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

/**
 * Attempt a fuzzy line-by-line match and replace.
 *
 * Trims each line of both the search pattern and the content before comparing,
 * handling indentation differences between AI-generated fix.before and actual file content.
 */
function fuzzyReplace(
  content: string,
  search: string,
  replacement: string
): string | null {
  const contentLines = content.split("\n");
  const searchLines = search
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((l) => l.trim());

  if (searchLines.length === 0) return null;

  // Find a contiguous block of lines in content whose trimmed versions match searchLines
  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let match = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trim() !== searchLines[j]) {
        match = false;
        break;
      }
    }

    if (match) {
      // Preserve the indentation of the first matched line for the replacement
      const leadingWhitespace = contentLines[i].match(/^(\s*)/)?.[1] ?? "";
      const replacementLines = replacement
        .replace(/\r\n/g, "\n")
        .trim()
        .split("\n");
      const indentedReplacement = replacementLines
        .map((line, idx) => (idx === 0 ? leadingWhitespace + line.trim() : leadingWhitespace + line.trim()))
        .join("\n");

      const before = contentLines.slice(0, i);
      const after = contentLines.slice(i + searchLines.length);
      return [...before, indentedReplacement, ...after].join("\n");
    }
  }

  return null;
}

/**
 * Apply a stored fix (fix.before -> fix.after) to a file in the sandbox.
 *
 * Reads the original file, replaces fix.before with fix.after (with whitespace
 * normalization and fuzzy matching), validates the result, and restores the
 * original file if validation fails.
 */
export async function applyStoredFix(
  sandbox: Sandbox,
  finding: Finding
): Promise<ApplyResult> {
  const filePath = finding.location.file;

  // Read original file from sandbox
  const originalBuffer = await sandbox.readFileToBuffer({ path: filePath });
  const originalContent = originalBuffer?.toString("utf-8") ?? "";

  // Normalize line endings for consistent matching
  const normalizedContent = normalContent(originalContent);
  const normalizedBefore = normalizeContent(finding.fix.before);
  const normalizedAfter = normalizeContent(finding.fix.after);

  let fixedContent: string;

  // Try exact match first (with normalized line endings)
  if (normalizedContent.includes(normalizedBefore)) {
    fixedContent = normalizedContent.replace(normalizedBefore, normalizedAfter);
  } else {
    // Try fuzzy line-by-line match
    const fuzzyResult = fuzzyReplace(
      normalizedContent,
      finding.fix.before,
      finding.fix.after
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

  // Verify the replace actually changed something
  if (fixedContent === normalizedContent) {
    return {
      valid: false,
      content: originalContent,
      errors: "fix.before pattern not found in file",
    };
  }

  // Write fixed file to sandbox
  await sandbox.writeFiles([
    { path: filePath, content: Buffer.from(fixedContent) },
  ]);

  // Validate the fix
  const validation = await runValidation(sandbox);

  if (!validation.passed) {
    // Restore original file on validation failure
    await sandbox.writeFiles([
      { path: filePath, content: Buffer.from(originalContent) },
    ]);

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

/**
 * Normalize content: replace \r\n with \n.
 */
function normalContent(text: string): string {
  return text.replace(/\r\n/g, "\n");
}
