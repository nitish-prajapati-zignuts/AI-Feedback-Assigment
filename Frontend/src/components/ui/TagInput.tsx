"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Tag as TagIcon, Plus } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags = [], onChange, placeholder = "Add tag (press Enter)..." }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 rounded-lg border border-input bg-background items-center">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[11px] font-medium py-0.5 px-2 flex items-center gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          >
            <TagIcon className="h-3 w-3" />
            <span>#{tag}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground px-1 py-0.5 min-w-[120px]"
        />
      </div>
    </div>
  );
}
