/**
 * ============================================
 * QUERY PARSER
 * Parse SQL-like filter queries into AST
 * ============================================
 */

import type { TaskPopulated } from "@/types";

export type FilterOperator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "like" | "in" | "not in";
export type LogicalOperator = "&&" | "||";

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | string[] | number | boolean;
}

export interface FilterExpression {
  type: "condition" | "logical";
  condition?: FilterCondition;
  logical?: LogicalOperator;
  left?: FilterExpression;
  right?: FilterExpression;
}

export interface ParseError {
  message: string;
  position: number;
}

// Valid filterable fields
export const FILTERABLE_FIELDS = [
  "done",
  "priority",
  "percentDone",
  "dueDate",
  "startDate",
  "endDate",
  "doneAt",
  "assignees",
  "labels",
  "project",
  "reminders",
  "created",
  "updated",
] as const;

export type FilterableField = (typeof FILTERABLE_FIELDS)[number];

// Valid operators
export const OPERATORS: FilterOperator[] = [
  "=",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "like",
  "in",
  "not in",
];

/**
 * Tokenize the query string
 */
function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"' || char === "'") {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
        if (current.trim()) {
          tokens.push(current.trim());
          current = "";
        }
      } else if (char === quoteChar) {
        inQuotes = false;
        tokens.push(current);
        current = "";
        quoteChar = "";
      } else {
        current += char;
      }
    } else if (inQuotes) {
      current += char;
    } else if (char === "(" || char === ")") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push(char);
    } else if (char === "&" && query[i + 1] === "&") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push("&&");
      i++; // Skip next &
    } else if (char === "|" && query[i + 1] === "|") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      tokens.push("||");
      i++; // Skip next |
    } else if (char === " " || char === "\t") {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens.filter((t) => t.length > 0);
}

/**
 * Parse a condition: field operator value
 */
function parseCondition(tokens: string[], start: number): {
  condition: FilterCondition | null;
  end: number;
  error: ParseError | null;
} {
  if (start >= tokens.length) {
    return {
      condition: null,
      end: start,
      error: { message: "Unexpected end of query", position: start },
    };
  }

  const field = tokens[start];
  if (!FILTERABLE_FIELDS.includes(field as FilterableField)) {
    return {
      condition: null,
      end: start,
      error: {
        message: `Unknown field: ${field}. Valid fields: ${FILTERABLE_FIELDS.join(", ")}`,
        position: start,
      },
    };
  }

  if (start + 1 >= tokens.length) {
    return {
      condition: null,
      end: start + 1,
      error: { message: "Missing operator", position: start + 1 },
    };
  }

  const operator = tokens[start + 1] as FilterOperator;
  if (!OPERATORS.includes(operator)) {
    return {
      condition: null,
      end: start + 1,
      error: {
        message: `Unknown operator: ${operator}. Valid operators: ${OPERATORS.join(", ")}`,
        position: start + 1,
      },
    };
  }

  if (start + 2 >= tokens.length) {
    return {
      condition: null,
      end: start + 2,
      error: { message: "Missing value", position: start + 2 },
    };
  }

  let value: string | string[] | number | boolean = tokens[start + 2];

  // Handle "in" and "not in" operators with comma-separated values
  if (operator === "in" || operator === "not in") {
    const values: string[] = [];
    let i = start + 2;
    while (i < tokens.length && tokens[i] !== "&&" && tokens[i] !== "||" && tokens[i] !== ")") {
      if (tokens[i] !== ",") {
        values.push(tokens[i]);
      }
      i++;
    }
    value = values;
    return {
      condition: { field, operator, value },
      end: i,
      error: null,
    };
  }

  // Parse value types
  if (value === "true" || value === "false") {
    value = value === "true";
  } else if (value === "now") {
    value = new Date().toISOString();
  } else if (!isNaN(Number(value)) && value !== "") {
    value = Number(value);
  }

  return {
    condition: { field, operator, value },
    end: start + 3,
    error: null,
  };
}

/**
 * Parse logical expression with precedence
 */
function parseExpression(
  tokens: string[],
  start: number = 0
): {
  expression: FilterExpression | null;
  end: number;
  error: ParseError | null;
} {
  if (start >= tokens.length) {
    return {
      expression: null,
      end: start,
      error: { message: "Empty expression", position: start },
    };
  }

  // Handle parentheses
  if (tokens[start] === "(") {
    const result = parseExpression(tokens, start + 1);
    if (result.error) return result;

    if (result.end >= tokens.length || tokens[result.end] !== ")") {
      return {
        expression: null,
        end: result.end,
        error: { message: "Unclosed parenthesis", position: result.end },
      };
    }

    return {
      expression: result.expression,
      end: result.end + 1,
      error: null,
    };
  }

  // Parse first condition
  const leftResult = parseCondition(tokens, start);
  if (leftResult.error) {
    return {
      expression: null,
      end: leftResult.end,
      error: leftResult.error,
    };
  }

  if (!leftResult.condition) {
    return {
      expression: null,
      end: leftResult.end,
      error: { message: "Invalid condition", position: start },
    };
  }

  let left: FilterExpression = {
    type: "condition",
    condition: leftResult.condition,
  };

  let currentPos = leftResult.end;

  // Handle logical operators (&& has higher precedence than ||)
  // First, parse all && operations
  while (
    currentPos < tokens.length &&
    tokens[currentPos] === "&&" &&
    tokens[currentPos] !== ")" &&
    tokens[currentPos] !== "||"
  ) {
    const rightResult = parseCondition(tokens, currentPos + 1);
    if (rightResult.error) {
      return {
        expression: null,
        end: rightResult.end,
        error: rightResult.error,
      };
    }

    if (!rightResult.condition) {
      break;
    }

    left = {
      type: "logical",
      logical: "&&",
      left,
      right: {
        type: "condition",
        condition: rightResult.condition,
      },
    };

    currentPos = rightResult.end;
  }

  // Then, parse || operations
  while (
    currentPos < tokens.length &&
    tokens[currentPos] === "||" &&
    tokens[currentPos] !== ")"
  ) {
    const rightResult = parseExpression(tokens, currentPos + 1);
    if (rightResult.error) {
      return {
        expression: null,
        end: rightResult.end,
        error: rightResult.error,
      };
    }

    if (!rightResult.expression) {
      break;
    }

    left = {
      type: "logical",
      logical: "||",
      left,
      right: rightResult.expression,
    };

    currentPos = rightResult.end;
  }

  return {
    expression: left,
    end: currentPos,
    error: null,
  };
}

/**
 * Parse a filter query string into an AST
 */
export function parseFilterQuery(
  query: string
): { expression: FilterExpression | null; error: ParseError | null } {
  if (!query.trim()) {
    return { expression: null, error: null };
  }

  const tokens = tokenize(query.trim());
  if (tokens.length === 0) {
    return { expression: null, error: null };
  }

  const result = parseExpression(tokens);
  return {
    expression: result.expression,
    error: result.error,
  };
}

/**
 * Evaluate a filter expression against a task
 */
export function evaluateFilter(
  expression: FilterExpression | null,
  task: TaskPopulated
): boolean {
  if (!expression) return true;

  if (expression.type === "condition" && expression.condition) {
    const { field, operator, value } = expression.condition;
    let taskValue: string | number | boolean | Date | string[] | null | undefined;

    // Map field names to task properties
    switch (field) {
      case "done":
        taskValue = task.completed;
        break;
      case "priority": {
        const priorityMap = { low: 1, medium: 2, high: 3 };
        taskValue = priorityMap[task.priority as keyof typeof priorityMap] || 0;
        break;
      }
      case "dueDate":
        taskValue = task.dueDate;
        break;
      case "doneAt":
        taskValue = task.completedAt;
        break;
      case "assignees": {
        taskValue = task.assignedTo?.map((u) =>
          typeof u === "string" ? u : u._id
        ) || [];
        break;
      }
      case "labels": {
        taskValue = task.labels?.map((l) =>
          typeof l === "string" ? l : l._id
        ) || [];
        break;
      }
      case "created":
        taskValue = task.createdAt;
        break;
      case "updated":
        taskValue = task.updatedAt;
        break;
      default:
        // For unknown fields, try to access as a property
        taskValue = (task as Record<string, unknown>)[field] as typeof taskValue;
    }

    // Evaluate operator
    switch (operator) {
      case "=":
        return taskValue === value;
      case "!=":
        return taskValue !== value;
      case ">":
        return taskValue != null && value != null && taskValue > value;
      case ">=":
        return taskValue != null && value != null && taskValue >= value;
      case "<":
        return taskValue != null && value != null && taskValue < value;
      case "<=":
        return taskValue != null && value != null && taskValue <= value;
      case "like":
        return taskValue != null && String(taskValue)
          .toLowerCase()
          .includes(String(value).toLowerCase());
      case "in":
        return Array.isArray(value) && taskValue != null && value.includes(String(taskValue));
      case "not in":
        return Array.isArray(value) && taskValue != null && !value.includes(String(taskValue));
      default:
        return false;
    }
  }

  if (expression.type === "logical" && expression.logical) {
    const leftResult = evaluateFilter(expression.left || null, task);
    const rightResult = evaluateFilter(expression.right || null, task);

    if (expression.logical === "&&") {
      return leftResult && rightResult;
    } else if (expression.logical === "||") {
      return leftResult || rightResult;
    }
  }

  return false;
}
