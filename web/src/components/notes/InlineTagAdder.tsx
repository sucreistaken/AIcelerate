import { useState, useRef, useEffect } from "react";

interface Props {
    noteId: string;
    existingTags: string[];
    allTags: string[];
    onAdd: (noteId: string, tag: string) => void;
}

export default function InlineTagAdder({ noteId, existingTags, allTags, onAdd }: Props) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setValue(""); } };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const suggestions = value.trim() ? allTags.filter(t => t.includes(value.toLowerCase()) && !existingTags.includes(t)).slice(0, 4) : [];
    const submit = (tag?: string) => {
        const t = (tag || value).trim().toLowerCase();
        if (t && !existingTags.includes(t)) onAdd(noteId, t);
        setValue(""); setOpen(false);
    };

    if (!open) return (
        <button className="nt-add-tag" onClick={() => setOpen(true)}>+ tag</button>
    );

    return (
        <div ref={ref} className="nt-tag-input-wrap">
            <input
                ref={inputRef} value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setValue(""); } }}
                placeholder="tag..."
                className="nt-tag-input"
            />
            {suggestions.length > 0 && (
                <div className="nt-tag-suggestions">
                    {suggestions.map(s => (
                        <div key={s} className="nt-tag-suggestion" onClick={() => submit(s)}>{s}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
