"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function TruncatedText({
  text,
  maxLength = 80,
  className = "",
}: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;

  if (!needsTruncation) {
    return <span className={className}>{text}</span>;
  }

  const displayText = isExpanded ? text : text.slice(0, maxLength);

  return (
    <div className={className}>
      <span className="whitespace-pre-wrap">{displayText}</span>
      {!isExpanded && <span>...</span>}
      <Button
        variant="link"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="h-auto p-0 ml-1 text-xs text-primary hover:no-underline cursor-pointer"
      >
        {isExpanded ? "Show less" : "Show more"}
      </Button>
    </div>
  );
}
