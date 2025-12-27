# Smart Engine Module

The Smart Engine is a deterministic, rule-based intelligence system for Projex that provides task prioritization, workload analysis, time estimation, and other insights **without using AI or machine learning**.

## Design Principles

- ✅ **Deterministic**: All outputs are based on rules and heuristics
- ✅ **Explainable**: Every score includes human-readable explanations
- ✅ **Transparent**: No black-box algorithms
- ✅ **Configurable**: All heuristics can be adjusted via configuration
- ✅ **Isolated**: Never accesses database directly, only consumes snapshots

## Architecture

```
backend/services/smartEngine/
├── index.js              # Main Smart Engine service
├── config.js             # Configuration system
├── explanation.js        # Explanation builder
├── snapshots.js          # Data snapshot utilities
├── priorityEngine.js     # Priority calculation
├── workloadEngine.js     # Workload & capacity analysis
├── estimationEngine.js   # Time estimation
└── duplicationEngine.js # Duplicate detection
```

## Core Concepts

### TaskSnapshot

Immutable, normalized representation of a task:

```javascript
{
  id: string,
  title: string,
  projectId: string | null,
  assignees: string[],
  labels: string[],
  priority: number,        // 1-5 (1=lowest, 5=highest)
  percentDone: number,     // 0-100
  estimatedTime: number | null,  // minutes
  actualTime: number | null,     // minutes
  dueDate: Date | null,
  startDate: Date | null,
  endDate: Date | null,
  done: boolean,
  doneAt: Date | null,
  dependencies: string[],
  createdAt: Date,
  updatedAt: Date
}
```

### UserSnapshot

Normalized user data for capacity analysis:

```javascript
{
  id: string,
  name: string,
  weeklyCapacity: number,  // minutes per week
  historicalAverageByLabel: { [labelId: string]: number },
  historicalAverageByProject: { [projectId: string]: number },
  availabilityByDay: { [day: string]: number }
}
```

### ProjectSnapshot

Normalized project data:

```javascript
{
  id: string,
  name: string,
  taskIds: string[],
  startDate: Date | null,
  endDate: Date | null,
  workingDays: number[],
  settings: object
}
```

## Usage

### Priority Engine

Calculate priority score for a task:

```javascript
const SmartEngine = require('./services/smartEngine');
const Task = require('./models/Task');
const Project = require('./models/Project');
const User = require('./models/User');

const task = await Task.findById(taskId);
const project = await Project.findById(task.project);
const users = await User.find({ _id: { $in: task.assignedTo } });

const result = await SmartEngine.calculatePriority(task, project, users);

// Result:
// {
//   taskId: string,
//   priorityScore: number,  // 0-100
//   reasons: string[],
//   explanation: string,
//   factors: Array<{factor, value, impact}>
// }
```

### Workload Engine

Analyze user workload:

```javascript
const user = await User.findById(userId);
const tasks = await Task.find({ assignedTo: userId, completed: false });

const result = await SmartEngine.calculateWorkload(user, tasks);

// Result:
// {
//   userId: string,
//   userName: string,
//   weeklyLoad: number,
//   capacity: number,
//   loadPercentage: number,
//   status: 'overload' | 'warning' | 'balanced' | 'underutilized',
//   warnings: string[],
//   suggestions: string[],
//   explanation: string
// }
```

### Time Estimation Engine

Estimate task duration:

```javascript
const task = await Task.findById(taskId);
const historicalTasks = await Task.find({ 
  completed: true, 
  actualTime: { $exists: true } 
});

const result = await SmartEngine.estimateTime(task, historicalTasks);

// Result:
// {
//   estimatedMinutes: number,
//   confidenceLevel: number,  // 0-1
//   basedOn: string[],
//   explanation: string,
//   sampleSize: number
// }
```

### Duplication Detection

Find similar tasks:

```javascript
const tasks = await Task.find({ project: projectId });
const results = await SmartEngine.detectDuplicates(tasks, project);

// Result:
// Array<{
//   taskId: string,
//   title: string,
//   hasDuplicates: boolean,
//   similarTasks: Array<{taskId, title, similarity}>,
//   explanation: string
// }>
```

## API Endpoints

All endpoints are under `/api/internal/smart-engine` and require authentication.

### POST /priority

Calculate priority for a single task.

**Request:**
```json
{
  "taskId": "string",
  "projectId": "string (optional)",
  "assigneeIds": ["string (optional)"],
  "currentDate": "ISO date string (optional)"
}
```

**Response:**
```json
{
  "taskId": "string",
  "priorityScore": 75,
  "reasons": ["due in 2 days", "blocks 3 tasks"],
  "explanation": "High priority because: due in 2 days, blocks 3 tasks.",
  "factors": [...]
}
```

### POST /priorities

Calculate priorities for multiple tasks.

**Request:**
```json
{
  "taskIds": ["string"],
  "projectId": "string (optional)"
}
```

### POST /workload

Calculate workload for a user.

**Request:**
```json
{
  "userId": "string"
}
```

### POST /workloads

Calculate workloads for multiple users.

**Request:**
```json
{
  "userIds": ["string (optional)"],
  "projectId": "string (optional)"
}
```

### POST /estimate

Estimate time for a task.

**Request:**
```json
{
  "taskId": "string",
  "userId": "string (optional)",
  "projectId": "string (optional)"
}
```

### POST /duplicates

Detect duplicate tasks.

**Request:**
```json
{
  "taskIds": ["string (optional)"],
  "projectId": "string (optional)"
}
```

### POST /dependencies

Analyze dependency impact.

**Request:**
```json
{
  "taskId": "string"
}
```

## Configuration

All heuristics are configurable via project settings:

```javascript
{
  "smartEngine": {
    "priority": {
      "weights": {
        "urgency": 3,
        "dependencies": 5,
        "overdue": 10,
        "manualPriority": 4,
        "completion": 2,
        "workload": 3
      },
      "urgencyDecay": 0.1,
      "overduePenalty": 2
    },
    "workload": {
      "overloadThreshold": 1.0,
      "underutilizedThreshold": 0.3,
      "warningThreshold": 0.9
    },
    "estimation": {
      "minSamples": 3,
      "useMedian": true,
      "confidenceThresholds": {
        "high": 0.8,
        "medium": 0.5,
        "low": 0.0
      }
    },
    "duplication": {
      "similarityThreshold": 0.7,
      "minTokens": 3
    }
  }
}
```

## Explanation System

Every Smart Engine output includes a human-readable explanation:

```javascript
const { buildExplanation } = require('./services/smartEngine/explanation');

const factors = [
  { factor: 'urgency', value: 2, impact: 'due in 2 days' },
  { factor: 'blocking', value: 3, impact: 'blocks 3 tasks' }
];

const explanation = buildExplanation('priority', factors);
// "High priority because: due in 2 days, blocks 3 tasks."
```

## Testing

The Smart Engine is designed to be easily testable:

```javascript
const { taskToSnapshot } = require('./services/smartEngine/snapshots');
const { calculatePriority } = require('./services/smartEngine/priorityEngine');

const taskSnapshot = {
  id: '1',
  title: 'Test Task',
  priority: 5,
  dueDate: new Date('2025-12-25'),
  // ... other fields
};

const result = calculatePriority(taskSnapshot, null, [], new Date());
```

## Future Enhancements

- Historical data aggregation for better estimates
- Critical path calculation
- Auto-rescheduling suggestions
- Workload balancing recommendations
- Predictive reporting
