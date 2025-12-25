/**
 * ============================================
 * TASK FILTER INPUT
 * Advanced filter input with query parser and autocomplete
 * ============================================
 */

import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTimes, 
  faTag, 
  faEquals, 
  faHashtag,
  faKeyboard,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseFilterQuery, FILTERABLE_FIELDS, OPERATORS, type ParseError, type FilterableField, type FilterOperator } from "@/lib/queryParser";

interface TaskFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onFilterChange?: (hasError: boolean) => void;
}

type SuggestionType = "field" | "operator" | "value";

interface Suggestion {
  text: string;
  type: SuggestionType;
  description?: string;
}

export const TaskFilterInput: React.FC<TaskFilterInputProps> = ({
  value,
  onChange,
  className,
  onFilterChange,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [parseError, setParseError] = useState<ParseError | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

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

  // Get field descriptions
  const getFieldDescription = (field: string): string => {
    const descriptions: Record<string, string> = {
      done: "Task completion status",
      priority: "Task priority level",
      percentDone: "Completion percentage",
      dueDate: "Task due date",
      startDate: "Task start date",
      endDate: "Task end date",
      doneAt: "Completion timestamp",
      assignees: "Assigned users",
      labels: "Task labels",
      project: "Project name",
      reminders: "Reminder settings",
      created: "Creation date",
      updated: "Last update date",
    };
    return descriptions[field] || "Filter field";
  };

  // Get all possible completions based on context
  const getAllPossibleCompletions = (query: string, position: number): Suggestion[] => {
    const beforeCursor = query.slice(0, position);
    const tokens = beforeCursor.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || "";

    const completions: Suggestion[] = [];

    // If we're at the start or after a logical operator, suggest fields
    if (
      !beforeCursor.trim() ||
      beforeCursor.trim().endsWith("&&") ||
      beforeCursor.trim().endsWith("||") ||
      beforeCursor.trim().endsWith("(")
    ) {
      completions.push(
        ...FILTERABLE_FIELDS.map(field => ({
          text: field,
          type: "field" as SuggestionType,
          description: getFieldDescription(field),
        }))
      );
    }
    // If we have a field, suggest operators
    else if (FILTERABLE_FIELDS.includes(lastToken as FilterableField)) {
      completions.push(
        ...OPERATORS.map(op => ({
          text: op,
          type: "operator" as SuggestionType,
          description: op === "=" ? "Equals" : 
                      op === "!=" ? "Not equals" :
                      op === ">" ? "Greater than" :
                      op === ">=" ? "Greater than or equal" :
                      op === "<" ? "Less than" :
                      op === "<=" ? "Less than or equal" :
                      op === "like" ? "Contains (text search)" :
                      op === "in" ? "In list" :
                      op === "not in" ? "Not in list" : "Operator",
        }))
      );
    }
    // If we have an operator, suggest values
    else if (OPERATORS.includes(lastToken as FilterOperator)) {
      const field = tokens[tokens.length - 2];
      if (field === "done") {
        completions.push(
          { text: "true", type: "value" as SuggestionType, description: "Completed tasks" },
          { text: "false", type: "value" as SuggestionType, description: "Incomplete tasks" }
        );
      } else if (field === "priority") {
        completions.push(
          { text: "1", type: "value" as SuggestionType, description: "Low priority" },
          { text: "2", type: "value" as SuggestionType, description: "Medium priority" },
          { text: "3", type: "value" as SuggestionType, description: "High priority" },
          { text: "low", type: "value" as SuggestionType, description: "Low priority" },
          { text: "medium", type: "value" as SuggestionType, description: "Medium priority" },
          { text: "high", type: "value" as SuggestionType, description: "High priority" }
        );
      } else if (field === "dueDate" || field === "startDate" || field === "endDate") {
        completions.push(
          { text: "now", type: "value" as SuggestionType, description: "Current date/time" },
          { text: "today", type: "value" as SuggestionType, description: "Today's date" },
          { text: "tomorrow", type: "value" as SuggestionType, description: "Tomorrow's date" }
        );
      }
    }
    // If we're typing a value (partial match), include all possible values
    else {
      // Check if we're after an operator
      const secondLastToken = tokens[tokens.length - 2];
      if (secondLastToken && OPERATORS.includes(secondLastToken as FilterOperator)) {
        const field = tokens[tokens.length - 3];
        if (field === "done") {
          completions.push(
            { text: "true", type: "value" as SuggestionType, description: "Completed tasks" },
            { text: "false", type: "value" as SuggestionType, description: "Incomplete tasks" }
          );
        } else if (field === "priority") {
          completions.push(
            { text: "1", type: "value" as SuggestionType, description: "Low priority" },
            { text: "2", type: "value" as SuggestionType, description: "Medium priority" },
            { text: "3", type: "value" as SuggestionType, description: "High priority" },
            { text: "low", type: "value" as SuggestionType, description: "Low priority" },
            { text: "medium", type: "value" as SuggestionType, description: "Medium priority" },
            { text: "high", type: "value" as SuggestionType, description: "High priority" }
          );
        } else if (field === "dueDate" || field === "startDate" || field === "endDate") {
          completions.push(
            { text: "now", type: "value" as SuggestionType, description: "Current date/time" },
            { text: "today", type: "value" as SuggestionType, description: "Today's date" },
            { text: "tomorrow", type: "value" as SuggestionType, description: "Tomorrow's date" }
          );
        }
      }
      // Also include fields and operators as fallback
      completions.push(
        ...FILTERABLE_FIELDS.map(field => ({
          text: field,
          type: "field" as SuggestionType,
          description: getFieldDescription(field),
        })),
        ...OPERATORS.map(op => ({
          text: op,
          type: "operator" as SuggestionType,
          description: "Operator",
        }))
      );
    }

    return completions;
  };

  // Highlight matching characters in suggestion text
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let queryIndex = 0;

    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        if (i > lastIndex) {
          parts.push(text.slice(lastIndex, i));
        }
        parts.push(
          <span key={i} className="font-semibold text-primary bg-primary/10 px-0.5 rounded">
            {text[i]}
          </span>
        );
        lastIndex = i + 1;
        queryIndex++;
      }
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Score suggestion match quality
  const scoreMatch = (suggestion: Suggestion, query: string): number => {
    if (!query) return 0;
    const lowerText = suggestion.text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Exact match
    if (lowerText === lowerQuery) return 100;
    // Starts with
    if (lowerText.startsWith(lowerQuery)) return 80;
    // Contains
    if (lowerText.includes(lowerQuery)) return 60;
    // Fuzzy match
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    if (queryIndex === lowerQuery.length) return 40;
    return 0;
  };

  // Filter and sort suggestions based on current word
  useEffect(() => {
    if (!currentWord) {
      setFilteredSuggestions(suggestions);
      setSelectedIndex(0);
      return;
    }

    const scored = suggestions
      .map(suggestion => ({
        suggestion,
        score: scoreMatch(suggestion, currentWord),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Sort by score (descending), then by type priority, then alphabetically
        if (b.score !== a.score) return b.score - a.score;
        const typeOrder: Record<SuggestionType, number> = { field: 0, operator: 1, value: 2 };
        if (typeOrder[a.suggestion.type] !== typeOrder[b.suggestion.type]) {
          return typeOrder[a.suggestion.type] - typeOrder[b.suggestion.type];
        }
        return a.suggestion.text.localeCompare(b.suggestion.text);
      })
      .map(item => item.suggestion);

    setFilteredSuggestions(scored);
    setSelectedIndex(0);
  }, [suggestions, currentWord]);

  // Find best matching completion using fuzzy matching
  const findBestMatch = (partial: string, completions: Suggestion[]): Suggestion | null => {
    if (!partial) return null;

    const scored = completions
      .map(c => ({ suggestion: c, score: scoreMatch(c, partial) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].suggestion : null;
  };

  // Generate suggestions based on cursor position
  const generateSuggestions = (query: string, position: number) => {
    const beforeCursor = query.slice(0, position);
    const wordMatch = beforeCursor.match(/([^\s&|()]+)$/);
    const currentWordValue = wordMatch ? wordMatch[1] : "";
    setCurrentWord(currentWordValue);

    const suggestionsList = getAllPossibleCompletions(query, position);

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
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      
      // If suggestions are showing and we have a selected one, use it
      if (showSuggestions && filteredSuggestions.length > 0 && selectedIndex < filteredSuggestions.length) {
        const match = filteredSuggestions[selectedIndex];
        handleSuggestionClick(match.text);
        return;
      }
      
      const cursorPos = inputRef.current?.selectionStart ?? 0;
      const beforeCursor = value.slice(0, cursorPos);
      const afterCursor = value.slice(cursorPos);
      
      // Extract the current word/token being typed
      const wordMatch = beforeCursor.match(/([^\s&|()]+)$/);
      const currentWordValue = wordMatch ? wordMatch[1] : "";
      
      // If there's a current word and it's not an operator, try to autocomplete
      if (currentWordValue && !OPERATORS.includes(currentWordValue as FilterOperator) && currentWordValue !== "&&" && currentWordValue !== "||") {
        // Use selected suggestion or find best match
        const match = filteredSuggestions.length > 0 && selectedIndex < filteredSuggestions.length
          ? filteredSuggestions[selectedIndex]
          : findBestMatch(currentWordValue, suggestions);
        
        if (match && match.text !== currentWordValue) {
          // Replace the current word with the match
          const beforeWord = beforeCursor.slice(0, beforeCursor.length - currentWordValue.length);
          // Add a space after the completion if there isn't one already
          const needsSpace = afterCursor && !afterCursor.startsWith(" ") && !afterCursor.startsWith(")");
          const newValue = beforeWord + match.text + (needsSpace ? " " : "") + afterCursor;
          const newCursorPos = beforeWord.length + match.text.length + (needsSpace ? 1 : 0);
          
          onChange(newValue);
          setCursorPosition(newCursorPos);
          setShowSuggestions(false);
          
          // Update cursor position
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              generateSuggestions(newValue, newCursorPos);
            }
          }, 0);
        }
      }
      // If no current word but we have suggestions, use the first/selected one
      else if (!currentWordValue && filteredSuggestions.length > 0) {
        const match = filteredSuggestions[selectedIndex] || filteredSuggestions[0];
        handleSuggestionClick(match.text);
      }
    } else if (e.key === "ArrowDown" && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    } else if (e.key === "ArrowUp" && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    } else if (e.key === "Enter" && showSuggestions && filteredSuggestions.length > 0 && selectedIndex < filteredSuggestions.length) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[selectedIndex].text);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(0);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const wordMatch = beforeCursor.match(/([^\s&|()]+)$/);
    const currentWordValue = wordMatch ? wordMatch[1] : "";
    const tokens = beforeCursor.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || "";
    const secondLastToken = tokens[tokens.length - 2] || "";

    let newValue: string;
    let newCursorPos: number;

    if (currentWordValue && !OPERATORS.includes(currentWordValue as FilterOperator) && currentWordValue !== "&&" && currentWordValue !== "||") {
      // Replace current word
      const beforeWord = beforeCursor.slice(0, beforeCursor.length - currentWordValue.length);
      const needsSpace = afterCursor && !afterCursor.startsWith(" ") && !afterCursor.startsWith(")");
      newValue = beforeWord + suggestionText + (needsSpace ? " " : "") + afterCursor;
      newCursorPos = beforeWord.length + suggestionText.length + (needsSpace ? 1 : 0);
    } else if (
      !beforeCursor.trim() ||
      beforeCursor.trim().endsWith("&&") ||
      beforeCursor.trim().endsWith("||") ||
      beforeCursor.trim().endsWith("(")
    ) {
      // Insert field at start or after logical operator
      newValue = beforeCursor + (beforeCursor.trim() ? " " : "") + suggestionText + " " + afterCursor;
      newCursorPos = beforeCursor.length + (beforeCursor.trim() ? 1 : 0) + suggestionText.length + 1;
    } else if (FILTERABLE_FIELDS.includes(lastToken as FilterableField)) {
      // Field is typed, insert operator after it
      const beforeLastToken = beforeCursor.slice(0, beforeCursor.lastIndexOf(lastToken));
      newValue = beforeLastToken + lastToken + " " + suggestionText + " " + afterCursor;
      newCursorPos = beforeLastToken.length + lastToken.length + 1 + suggestionText.length + 1;
    } else if (OPERATORS.includes(lastToken as FilterOperator) || (lastToken === "" && OPERATORS.includes(secondLastToken as FilterOperator))) {
      // After an operator, insert value (handle case where cursor is after space)
      // Remove trailing whitespace before inserting
      const trimmedBefore = beforeCursor.trimEnd();
      const trailingSpaces = beforeCursor.length - trimmedBefore.length;
      newValue = trimmedBefore + (trailingSpaces > 0 ? " " : "") + suggestionText + " " + afterCursor;
      newCursorPos = trimmedBefore.length + (trailingSpaces > 0 ? 1 : 0) + suggestionText.length + 1;
    } else {
      // Default: insert suggestion
      // Remove trailing whitespace if present
      const trimmedBefore = beforeCursor.trimEnd();
      const trailingSpaces = beforeCursor.length - trimmedBefore.length;
      newValue = trimmedBefore + (trailingSpaces > 0 ? " " : "") + suggestionText + " " + afterCursor;
      newCursorPos = trimmedBefore.length + (trailingSpaces > 0 ? 1 : 0) + suggestionText.length + 1;
    }

    onChange(newValue);
    setShowSuggestions(false);
    setSelectedIndex(0);

    // Focus input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        setCursorPosition(newCursorPos);
        generateSuggestions(newValue, newCursorPos);
      }
    }, 0);
  };

  const getSuggestionIcon = (type: SuggestionType) => {
    switch (type) {
      case "field":
        return faTag;
      case "operator":
        return faEquals;
      case "value":
        return faHashtag;
      default:
        return faKeyboard;
    }
  };

  const getSuggestionBadgeVariant = (type: SuggestionType): "default" | "secondary" | "outline" => {
    switch (type) {
      case "field":
        return "default";
      case "operator":
        return "secondary";
      case "value":
        return "outline";
      default:
        return "secondary";
    }
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

      {/* Enhanced Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg dark:shadow-xl max-h-72 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FontAwesomeIcon icon={faKeyboard} className="w-3 h-3" />
              <span>Tab to complete</span>
            </span>
          </div>

          {/* Suggestions List */}
          <div className="overflow-y-auto max-h-60">
            {filteredSuggestions.map((suggestion, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={`${suggestion.text}-${index}`}
                  ref={isSelected ? selectedRef : null}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors",
                    "hover:bg-muted/40 hover:text-foreground",
                    // Dark mode hover - lighter shade of background (hsl(222.2, 84%, 8%) vs background's 4.9%)
                    "dark:hover:bg-[hsl(222.2_84%_8%)] dark:hover:text-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                    isSelected 
                      ? "bg-accent/20" 
                      : "bg-muted"
                  )}>
                    <FontAwesomeIcon 
                      icon={getSuggestionIcon(suggestion.type)} 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        suggestion.type === "field" && "text-primary",
                        suggestion.type === "operator" && "text-secondary-foreground",
                        suggestion.type === "value" && "text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold text-foreground">
                        {highlightMatch(suggestion.text, currentWord)}
                      </code>
                      <Badge 
                        variant={getSuggestionBadgeVariant(suggestion.type)}
                        className={cn(
                          "text-xs px-1.5 py-0 h-4",
                          isSelected && "opacity-90"
                        )}
                      >
                        {suggestion.type}
                      </Badge>
                    </div>
                    {suggestion.description && (
                      <p className={cn(
                        "text-xs mt-0.5 truncate text-muted-foreground",
                        isSelected && "opacity-80"
                      )}>
                        {suggestion.description}
                      </p>
                    )}
                  </div>

                  {/* Arrow indicator for selected */}
                  {isSelected && (
                    <FontAwesomeIcon 
                      icon={faChevronRight} 
                      className="w-3 h-3 text-muted-foreground flex-shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
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
