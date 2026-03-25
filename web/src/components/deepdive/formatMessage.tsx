import React from "react";
import CodeBlock from "./CodeBlock";

const formatLine = (text: string, kp: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0, m, pi = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={`${kp}-b${pi++}`}>{m[2]}</strong>);
    else if (m[3]) parts.push(<code key={`${kp}-c${pi++}`} className="dd-inline-code">{m[3]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
};

const formatTextBlock = (text: string, prefix: string): React.ReactNode[] => {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('\• ') || line.startsWith('- '))
      return <div key={`${prefix}-${i}`} className="dd-list-item">{'\• '}{formatLine(line.slice(2), `${prefix}-l${i}`)}</div>;
    if (line.trim() === '---' || line.includes('Suggested Questions:') || /^\d+\.\s/.test(line.trim())) return null;
    if (!line.trim()) return <div key={`${prefix}-${i}`} className="dd-spacer">{'\ '}</div>;
    return <div key={`${prefix}-${i}`} className="dd-text-line">{formatLine(line, `${prefix}-l${i}`)}</div>;
  }).filter(Boolean) as React.ReactNode[];
};

export const formatMessage = (content: string): React.ReactNode[] => {
  const re = /```(\w*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let last = 0, m, bi = 0;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(...formatTextBlock(content.slice(last, m.index), `pre-${bi}`));
    parts.push(<CodeBlock key={`code-${bi}`} language={m[1]} code={m[2]} />);
    last = re.lastIndex; bi++;
  }
  if (last < content.length) parts.push(...formatTextBlock(content.slice(last), `post-${bi}`));
  return parts;
};
