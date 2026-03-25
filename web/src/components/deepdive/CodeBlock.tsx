import { useState } from "react";

export default function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="dd-code-block">
      <div className="dd-code-header">
        <span>{language || "code"}</span>
        <button onClick={handleCopy} className="dd-code-copy">
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      <pre className="dd-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
