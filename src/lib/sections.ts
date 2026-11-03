export type CaseSection = {
  heading: string | null;
  markdown: string;
  isResults: boolean;
};

export function splitCaseSections(markdown: string): CaseSection[] {
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const parts = text.split(/^## +/m);
  const sections: CaseSection[] = [];
  if (parts[0]?.trim()) {
    sections.push({ heading: null, markdown: parts[0].trim(), isResults: false });
  }
  for (const part of parts.slice(1)) {
    const breakAt = part.indexOf('\n');
    const heading = (breakAt === -1 ? part : part.slice(0, breakAt)).trim();
    const body = breakAt === -1 ? '' : part.slice(breakAt + 1).trim();
    sections.push({
      heading,
      markdown: body ? `## ${heading}\n\n${body}` : `## ${heading}`,
      isResults: /^results\b/i.test(heading) || /^proof\b/i.test(heading),
    });
  }
  return sections;
}
