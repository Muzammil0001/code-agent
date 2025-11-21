# Example Workflow: Creating a New API Endpoint

This workflow demonstrates how CodeMind AI safely creates a new API endpoint with proper permission handling.

## Scenario

Create a new REST API endpoint for user authentication in a Next.js application.

## Steps

### 1. User Request

User runs command: `CodeMind: Generate Code`

Prompt: "Create a POST /api/auth/login endpoint that accepts email and password"

### 2. Agent Planning

**PlannerAgent** analyzes the request and creates an execution plan:

```
Plan Steps:
1. Create new file: src/pages/api/auth/login.ts
2. Generate authentication logic
3. Add input validation
4. Add error handling
5. Generate tests
```

### 3. Permission Request

**PermissionEngine** requests approval:

```
🟡 Create new file: login.ts

Impact: New API endpoint will be created
Affected files: 1
Reversible: Yes

Options:
✓ Allow Once
✓✓ Always Allow (for file-create)
? Always Ask
✗ Deny
```

User selects: **✓ Allow Once**

### 4. Code Generation

**CoderAgent** generates the code:

```typescript
// src/pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // TODO: Implement authentication logic
    // This is a placeholder - integrate with your auth system
    
    return res.status(200).json({ 
      success: true,
      message: 'Login successful'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error'
    });
  }
}
```

### 5. Code Review

**ReviewerAgent** analyzes the generated code:

```
✅ Proper input validation
✅ Error handling implemented
✅ HTTP method check
⚠️  Authentication logic needs implementation
✅ Type-safe with TypeScript
```

### 6. Test Generation

**TestAgent** offers to generate tests:

```
Generate tests for this endpoint?
✓ Yes
✗ No
```

User selects: **✓ Yes**

Creates `src/pages/api/auth/login.test.ts`:

```typescript
import { createMocks } from 'node-mocks-http';
import handler from './login';

describe('/api/auth/login', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should validate email format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'invalid-email',
        password: 'password123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should validate password length', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'user@example.com',
        password: 'short'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
```

### 7. Project Brain Update

**ProjectBrain** updates its understanding:

```
New API endpoint detected:
- Route: /api/auth/login
- Method: POST
- Framework: Next.js
- Dependencies: zod
- Related files: None yet
```

### 8. Memory Storage

**MemoryEngine** stores the operation:

```
Operation: API endpoint creation
Files created: 2
User feedback: Approved
Patterns learned: Next.js API route structure
```

## Result

- ✅ New API endpoint created
- ✅ Tests generated
- ✅ Code reviewed for quality
- ✅ Project understanding updated
- ✅ User maintained full control

## Time Taken

- Planning: 0.5s
- Code generation: 2.1s
- Review: 0.8s
- Test generation: 1.9s
- **Total: 5.3s**

## Model Used

- Groq LLaMA 3.1 70B (selected for speed)
- Tokens used: 1,247
- Latency: 156ms (first token)
