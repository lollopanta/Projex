/**
 * ============================================
 * TASK FILTER INPUT
 * Advanced filter input with query parser and autocomplete
 * ============================================
 */

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseFilterQuery, FILTERABLE_FIELDS, OPERATORS, type ParseError } from "@/lib/queryParser";

interface TaskFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onFilterChange?: (hasError: boolean) => void;
}

export const TaskFilterInput: React.FC<TaskFilterInputProps> = ({
  value,
  onChange,
  className,
  onFilterChange,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Parse query and show errors
  useEffect(() => {
    if (!value.trim()) {
      setParseError(null);
      onFilterChange?.(false);
      return;
    }

    const { error } = parseFilterQuery(value);
    setParseError(error);
    onFilterChange?.(!!error);
  }, [value, onFilterChange]);

  // Generate suggestions based on cursor position
  const generateSuggestions = (query: string, position: number) => {
    const beforeCursor = query.slice(0, position);
    const lastToken = beforeCursor.trim().split(/\s+/).pop() || "";

    const suggestionsList: string[] = [];

    // If we're at the start or after a logical operator, suggest fields
    if (
      !beforeCursor.trim() ||
      beforeCursor.trim().endsWith("&&") ||
      beforeCursor.trim().endsWith("||") ||
      beforeCursor.trim().endsWith("(")
    ) {
      suggestionsList.push(...FILTERABLE_FIELDS);
    }
    // If we have a field, suggest operators
    else if (FILTERABLE_FIELDS.includes(lastToken as any)) {
      suggestionsList.push(...OPERATORS);
    }
    // If we have an operator, suggest values
    else if (OPERATORS.includes(lastToken as any)) {
      const field = beforeCursor.trim().split(/\s+/).slice(-2)[0];
      if (field === "done") {
        suggestionsList.push("true", "false");
      } else if (field === "priority") {
        suggestionsList.push("1", "2", "3", "low", "medium", "high");
      } else if (field === "dueDate" || field === "startDate" || field === "endDate") {
        suggestionsList.push("now", "today", "tomorrow");
      }
    }

    setSuggestions(suggestionsList);
    setShowSuggestions(suggestionsList.length > 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setCursorPosition(e.target.selectionStart || 0);
    generateSuggestions(newValue, e.target.selectionStart || 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      // Focus first suggestion
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const lastToken = beforeCursor.trim().split(/\s+/).pop() || "";

    let newValue: string;

    if (
      !beforeCursor.trim() ||
      beforeCursor.trim().endsWith("&&") ||
      beforeCursor.trim().endsWith("||") ||
      beforeCursor.trim().endsWith("(")
    ) {
      // Insert field
      newValue = beforeCursor + (beforeCursor.trim() ? " " : "") + suggestion + " " + afterCursor;
    } else if (FILTERABLE_FIELDS.includes(lastToken as any)) {
      // Replace field with field + operator
      const beforeLastToken = beforeCursor.slice(0, beforeCursor.lastIndexOf(lastToken));
      newValue = beforeLastToken + lastToken + " " + suggestion + " " + afterCursor;
    } else {
      // Insert suggestion
      newValue = beforeCursor + suggestion + " " + afterCursor;
    }

    onChange(newValue);
    setShowSuggestions(false);

    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = newValue.indexOf(suggestion) + suggestion.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
        setCursorPosition(newPosition);
      }
    }, 0);
  };

  const handleClear = () => {
    onChange("");
    setShowSuggestions(false);
    setParseError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Filter tasks (e.g., priority = 3 && dueDate < now)"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value) {
              generateSuggestions(value, cursorPosition);
            }
          }}
          onBlur={() => {
            // Delay to allow suggestion clicks
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          className={cn(
            parseError && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {value && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <p className="text-xs text-destructive mt-1">
          {parseError.message} (position {parseError.position})
        </p>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <code className="text-xs font-mono">{suggestion}</code>
            </button>
          ))}
        </div>
      )}

      {/* Help Text */}
      {!value && (
        <p className="text-xs text-muted-foreground mt-1">
          Examples: <code className="text-xs">priority = 3</code>,{" "}
          <code className="text-xs">dueDate &lt; now</code>,{" "}
          <code className="text-xs">done = false &amp;&amp; priority &gt;= 2</code>
        </p>
      )}
    </div>
  );
};
