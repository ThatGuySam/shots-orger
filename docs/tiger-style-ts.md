# TigerStyle

## The Essence Of Style

> “There are three things extremely hard: steel, a diamond, and to know one's self.” — Benjamin
> Franklin

TigerBeetle's coding style is evolving. A collective give-and-take at the intersection of
engineering and art. Numbers and human intuition. Reason and experience. First principles and
knowledge. Precision and poetry. Just like music. A tight beat. A rare groove. Words that rhyme and
rhymes that break. Biodigital jazz. This is what we've learned along the way. The best is yet to
come.

## Why Have Style?

Another word for style is design.

> “The design is not just what it looks like and feels like. The design is how it works.” — Steve
> Jobs

Our design goals are safety, performance, and developer experience. In that order. All three are
important. Good style advances these goals. Does the code make for more or less safety, performance
or developer experience? That is why we need style.

Put this way, style is more than readability, and readability is table stakes, a means to an end
rather than an end in itself.

> “...in programming, style is not something to pursue directly. Style is necessary only where
> understanding is missing.” ─ [Let Over
> Lambda](https://letoverlambda.com/index.cl/guest/chap1.html)

This document explores how we apply these design goals to coding style. First, a word on simplicity,
elegance and technical debt.

## On Simplicity And Elegance

Simplicity is not a free pass. It's not in conflict with our design goals. It need not be a
concession or a compromise.

Rather, simplicity is how we bring our design goals together, how we identify the "super idea" that
solves the axes simultaneously, to achieve something elegant.

> “Simplicity and elegance are unpopular because they require hard work and discipline to achieve” —
> Edsger Dijkstra

Contrary to popular belief, simplicity is also not the first attempt but the hardest revision. It's
easy to say “let's do something simple”, but to do that in practice takes thought, multiple passes,
many sketches, and still we may have to [“throw one
away”](https://en.wikipedia.org/wiki/The_Mythical_Man-Month).

The hardest part, then, is how much thought goes into everything.

We spend this mental energy upfront, proactively rather than reactively, because we know that when
the thinking is done, what is spent on the design will be dwarfed by the implementation and testing,
and then again by the costs of operation and maintenance.

An hour or day of design is worth weeks or months in production:

> “the simple and elegant systems tend to be easier and faster to design and get right, more
> efficient in execution, and much more reliable” — Edsger Dijkstra

## Technical Debt

What could go wrong? What's wrong? Which question would we rather ask? The former, because code,
like steel, is less expensive to change while it's hot. A problem solved in production is many times
more expensive than a problem solved in implementation, or a problem solved in design.

Since it's hard enough to discover showstoppers, when we do find them, we solve them. We don't allow
potential memcpy latency spikes, or exponential complexity algorithms to slip through.

> “You shall not pass!” — Gandalf

In other words, TigerBeetle has a “zero technical debt” policy. We do it right the first time. This
is important because the second time may not transpire, and because doing good work, that we can be
proud of, builds momentum.

We know that what we ship is solid. We may lack crucial features, but what we have meets our design
goals. This is the only way to make steady incremental progress, knowing that the progress we have
made is indeed progress.

## Safety

> “The rules act like the seat-belt in your car: initially they are perhaps a little uncomfortable,
> but after a while their use becomes second-nature and not using them becomes unimaginable.” —
> Gerard J. Holzmann

[NASA's Power of Ten — Rules for Developing Safety Critical
Code](https://spinroot.com/gerard/pdf/P10.pdf) will change the way you code forever. To expand:

- Use **only very simple, explicit control flow** for clarity. **Do not use recursion** to ensure
  that all executions that should be bounded are bounded. Use **only a minimum of excellent
  abstractions** but only if they make the best sense of the domain. Abstractions are [never zero
  cost](https://isaacfreund.com/blog/2022-05/). Every abstraction introduces the risk of a leaky
  abstraction.

- **Put a limit on everything** because, in reality, this is what we expect—everything has a limit.
  For example, all loops and all queues must have a fixed upper bound to prevent infinite loops or
  tail latency spikes. This follows the [“fail-fast”](https://en.wikipedia.org/wiki/Fail-fast)
  principle so that violations are detected sooner rather than later. Where a loop cannot terminate
  (e.g. an event loop), this must be asserted.



- **Assertions detect programmer errors. Unlike operating errors, which are expected and which must
  be handled, assertion failures are unexpected. The only correct way to handle corrupt code is to
  crash. Assertions downgrade catastrophic correctness bugs into liveness bugs. Assertions are a
  force multiplier for discovering bugs by fuzzing.**

  - **Assert all function arguments and return values, pre/postconditions and invariants.** A
    function must not operate blindly on data it has not checked. The purpose of a function is to
    increase the probability that a program is correct. Assertions within a function are part of how
    functions serve this purpose. The assertion density of the code must average a minimum of two
    assertions per function.

  - **[Pair assertions](https://tigerbeetle.com/blog/2023-12-27-it-takes-two-to-contract).** For
    every property you want to enforce, try to find at least two different code paths where an
    assertion can be added. For example, assert validity of data right before writing it to disk,
    and also immediately after reading from disk.

  - On occasion, you may use a blatantly true assertion instead of a comment as stronger
    documentation where the assertion condition is critical and surprising.

  - Split compound assertions: prefer `assert(a); assert(b);` over `assert(a and b);`.
    The former is simpler to read, and provides more precise information if the condition fails.

  - **Use JSDoc with TypeScript for build-free type checking** as a way to enforce type safety and document interfaces without the overhead of compilation. JSDoc provides type annotations that TypeScript can validate, giving you safety benefits while keeping plain JavaScript files. This is particularly powerful for gradually adding type safety to existing codebases or maintaining build-free development workflows.

    **Basic JSDoc Type Annotations:**
    ```js
    /** @type {HTMLElement} */
    const headingElement = document.createElement("h1");

    /**
     * @param {Node} node
     * @returns {string}
     */
    function getNodeName(node) {
      return node.nodeName.toLowerCase();
    }
    ```

    **Custom Type Definitions:**
    ```js
    /**
     * @typedef {Object} TransferOptions
     * @property {string} fromAccountId
     * @property {string} toAccountId
     * @property {number} amount - Must be positive
     * @property {string} [description=""] - Optional description
     */

    /**
     * @param {TransferOptions} options
     * @returns {Promise<boolean>}
     */
    async function processTransfer(options) {
      // TypeScript will validate the structure matches TransferOptions
    }
    ```

    **Type Assertions for Design Contracts:**
    Like compile-time assertions in systems languages, JSDoc type assertions let you define contracts that must be satisfied. This is especially useful for state machines or complex data structures where you want to ensure type safety without runtime overhead:

    ```js
    // Define the contract - empty object with type assertion
    const machine = {
      context: /** @type {{id: string, balance: number}} */({})
    };
    ```

    Set up TypeScript checking with `jsconfig.json`:
    ```json
    {
      "compilerOptions": {
        "allowJs": true,
        "checkJs": true,
        "strict": true,
        "noEmit": true
      },
      "include": ["src"]
    }
    ```

  - **The golden rule of assertions is to assert the _positive space_ that you do expect AND to
    assert the _negative space_ that you do not expect** because where data moves across the
    valid/invalid boundary between these spaces is where interesting bugs are often found. This is
    also why **tests must test exhaustively**, not only with valid data but also with invalid data,
    and as valid data becomes invalid.

### Rigorous Testing for JavaScript Applications

JavaScript testing must go beyond typical unit tests to cover the unique challenges of web development: asynchronous operations, user interactions, network failures, and browser inconsistencies.

**Modern Testing Tools for Tiger Style:**

**MSW (Mock Service Worker)** for API mocking:
- **Reusable across environments:** Same mock definitions work in unit tests, integration tests, Storybook, and development
- **Network-level interception:** Uses Service Worker API in browsers and class extension in Node.js for realistic testing
- **Framework agnostic:** Works with any testing framework without adapters or plugins
- **Deterministic:** Provides consistent, controllable network behavior for reliable tests

**Zod for Schema Validation Testing:**
- **Type-safe validation:** Ensures data integrity at runtime, catching errors TypeScript might miss
- **Business rule enforcement:** Use refinements to encode complex domain logic
- **Comprehensive error reporting:** Detailed validation errors help identify exactly what went wrong
- **Input/output contracts:** Validate both function inputs and outputs to ensure correctness

**Test Exhaustively, Not Just Happy Paths:**
```js
import { describe, expect, test } from 'vitest';

// Test both positive and negative space
describe('validateEmail', () => {
  test('accepts valid emails', () => {
    const validEmails = [
      'user@example.com',
      'test.email+tag@domain.co.uk',
      'user123@sub.domain.org'
    ];
    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });
  
  test('rejects invalid emails', () => {
    const invalidEmails = [
      '',
      'invalid',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      null,
      undefined,
      123,
      {}
    ];
    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });
});
```

**Simulate Real-World Conditions:**

*Front-End Testing:*
```js
import { describe, expect, test, beforeAll, afterAll, afterEach } from 'vitest';
import { screen, userEvent } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Setup MSW server for consistent API mocking
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test rapid user interactions
test('handles rapid button clicks gracefully', async () => {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: /submit/i });
  
  // Simulate user rapidly clicking submit button
  await Promise.all([
    user.click(button),
    user.click(button),
    user.click(button)
  ]);
  
  // Should only submit once
  expect(screen.getByText(/submitted/i)).toBeInTheDocument();
  expect(mockSubmit).toHaveBeenCalledTimes(1);
});

// Test network failures
test('shows error when API call fails', async () => {
  server.use(
    http.post('/api/submit', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );
  
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(await screen.findByText(/error occurred/i)).toBeInTheDocument();
});
```

*Back-End Testing:*
```js
import { describe, expect, test, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Setup MSW server for API mocking
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test concurrent operations
test('handles concurrent transfers safely', async () => {
  const account = await createTestAccount({ balance: 1000 });
  
  // Start multiple transfers simultaneously
  const transfers = await Promise.allSettled([
    processTransfer({ from: account.id, to: 'other1', amount: 600 }),
    processTransfer({ from: account.id, to: 'other2', amount: 600 }),
    processTransfer({ from: account.id, to: 'other3', amount: 600 })
  ]);
  
  // Only one should succeed due to insufficient funds
  const successful = transfers.filter(t => t.status === 'fulfilled');
  expect(successful).toHaveLength(1);
  
  // Account balance should be consistent
  const finalBalance = await getAccountBalance(account.id);
  expect(finalBalance).toBe(400); // 1000 - 600
});

// Test database connection failures
test('handles API errors gracefully', async () => {
  // Mock API to return service unavailable
  server.use(
    http.post('/api/transfer', () => {
      return HttpResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    })
  );
  
  const response = await fetch('/api/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'acc1', to: 'acc2', amount: 100 })
  });
    
  expect(response.status).toBe(503);
  
  const body = await response.json();
  expect(body.error).toMatch(/service unavailable/i);
});
```

**Deterministic Testing:**
```js
import { describe, expect, test, vi } from 'vitest';

// Use fake timers for time-dependent code
test('expires cache after timeout', () => {
  vi.useFakeTimers();
  
  const cache = createUserCache();
  cache.set('user1', { name: 'John' });
  
  expect(cache.get('user1')).toEqual({ name: 'John' });
  
  // Fast-forward time
  vi.advanceTimersByTime(5 * 60 * 1000 + 1); // 5 minutes + 1ms
  
  expect(cache.get('user1')).toBeNull();
  
  vi.useRealTimers();
});

// Mock external dependencies for consistent results
test('processes payment with external service', async () => {
  const mockPaymentService = vi.mocked(paymentService);
  mockPaymentService.charge.mockResolvedValue({ 
    id: 'pay_123', 
    status: 'succeeded' 
  });
  
  const result = await processPayment({
    amount: 1000,
    customerId: 'cust_456'
  });
  
  expect(result.paymentId).toBe('pay_123');
  expect(mockPaymentService.charge).toHaveBeenCalledWith({
    amount: 1000,
    customer: 'cust_456'
  });
});
```

**Schema-Based Testing with Zod:**
```js
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

// Define strict schemas for validation testing
const CurrencySchema = z.string().regex(/^\$[\d,]+\.\d{2}$/);
const AmountSchema = z.number().min(0).max(1000000).finite();

// Test with schema validation to ensure type safety
test('formatCurrency validates input and output schemas', () => {
  // Test valid inputs
  const validAmounts = [0, 100, 1000.50, 999999.99];
  
  validAmounts.forEach(amount => {
    // Validate input meets our schema
    expect(() => AmountSchema.parse(amount)).not.toThrow();
    
    const formatted = formatCurrency(amount);
    
    // Validate output meets currency format schema
    expect(() => CurrencySchema.parse(formatted)).not.toThrow();
    
    // Additional business logic validation
    expect(formatted).not.toContain('NaN');
    expect(formatted).not.toContain('Infinity');
    
    // Should be parseable back to a number
    const parsed = parseFloat(formatted.replace(/[$,]/g, ''));
    expect(Math.abs(parsed - amount)).toBeLessThan(0.01);
  });
});

// Test edge cases and invalid inputs
test('formatCurrency handles invalid inputs safely', () => {
  const invalidInputs = [
    NaN,
    Infinity,
    -Infinity,
    -1,
    1000001, // Above max
    'not-a-number',
    null,
    undefined
  ];
  
  invalidInputs.forEach(input => {
    // Should fail input validation
    expect(() => AmountSchema.parse(input)).toThrow();
    
    // Function should handle gracefully (throw or return error indicator)
    expect(() => formatCurrency(input)).toThrow();
  });
});

// Test schema refinements for business rules
test('validates complex business rules with Zod refinements', () => {
  const TransferSchema = z.object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.number().positive()
  }).refine(
    (data) => data.fromAccountId !== data.toAccountId,
    { message: 'Cannot transfer to the same account' }
  ).refine(
    (data) => data.amount <= 10000,
    { message: 'Transfer amount exceeds daily limit' }
  );
  
  // Valid transfer
  expect(() => TransferSchema.parse({
    fromAccountId: 'acc1',
    toAccountId: 'acc2', 
    amount: 500
  })).not.toThrow();
  
  // Invalid transfer - same account
  expect(() => TransferSchema.parse({
    fromAccountId: 'acc1',
    toAccountId: 'acc1',
    amount: 500
  })).toThrow();
  
  // Invalid transfer - exceeds limit
  expect(() => TransferSchema.parse({
    fromAccountId: 'acc1',
    toAccountId: 'acc2',
    amount: 15000
  })).toThrow();
});
```

**Error Handling Testing:**
Remember that [92% of catastrophic failures stem from incorrect handling of non-fatal errors](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-yuan.pdf). Test every error path:

```js
import { describe, expect, test, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Setup MSW server for API mocking
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test all error scenarios
describe('API error handling', () => {
  test('handles validation errors', async () => {
    // Mock API to return validation error
    server.use(
      http.post('/api/users', async ({ request }) => {
        const body = await request.json();
        if (!body.email?.includes('@')) {
          return HttpResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          );
        }
        return HttpResponse.json({ id: 1, email: body.email });
      })
    );
    
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });
      
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
  
  test('handles database errors', async () => {
    // Mock API to return database error
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      })
    );
    
    const response = await fetch('/api/users');
      
    expect(response.status).toBe(500);
    
    const body = await response.json();
    expect(body.error).toMatch(/internal server error/i);
  });
  
  test('handles timeout errors', async () => {
    // Mock API to simulate timeout
    server.use(
      http.post('/api/external-data', () => {
        return HttpResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      })
    );
    
    const response = await fetch('/api/external-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' })
    });
      
    expect(response.status).toBe(408);
  });
});
```

  - Assertions are a safety net, not a substitute for human understanding. With simulation testing,
    there is the temptation to trust the fuzzer. But a fuzzer can prove only the presence of bugs,
    not their absence. Therefore:
    - Build a precise mental model of the code first,
    - encode your understanding in the form of assertions,
    - write the code and comments to explain and justify the mental model to your reviewer,
    - and use VOPR as the final line of defense, to find bugs in your and reviewer's understanding
      of code.



- Declare variables at the **smallest possible scope**, and **minimize the number of variables in
  scope**, to reduce the probability that variables are misused.

- Restrict the length of function bodies to reduce the probability of poorly structured code. We
  enforce a **hard limit of 70 lines per function**.

  Splitting code into functions requires taste. There are many ways to cut a wall of code into
  chunks of 70 lines, but only a few splits will feel right. Some rules of thumb:

  * Good function shape is often the inverse of an hourglass: a few parameters, a simple return
    type, and a lot of meaty logic between the braces.
  * Centralize control flow. When splitting a large function, try to keep all switch/if
    statements in the "parent" function, and move non-branchy logic fragments to helper
    functions. Divide responsibility. All control flow should be handled by _one_ function, the rest shouldn't
    care about control flow at all. In other words,
    ["push `if`s up and `for`s down"](https://matklad.github.io/2023/11/15/push-ifs-up-and-fors-down.html).
  * Similarly, centralize state manipulation. Let the parent function keep all relevant state in
    local variables, and use helpers to compute what needs to change, rather than applying the
    change directly. Keep leaf functions pure.

- Appreciate, from day one, **all compiler warnings at the compiler's strictest setting**.

- Whenever your program has to interact with external entities, **don't do things directly in
  reaction to external events**. Instead, your program should run at its own pace. Not only does
  this make your program safer by keeping the control flow of your program under your control, it
  also improves performance for the same reason (you get to batch, instead of context switching on
  every event). Additionally, this makes it easier to maintain bounds on work done per time period.

Beyond these rules:

- Compound conditions that evaluate multiple booleans make it difficult for the reader to verify
  that all cases are handled. Split compound conditions into simple conditions using nested
  `if/else` branches. Split complex `else if` chains into `else { if { } }` trees. This makes the
  branches and cases clear. Again, consider whether a single `if` does not also need a matching
  `else` branch, to ensure that the positive and negative spaces are handled or asserted.

- Negations are not easy! State invariants positively. When working with lengths and indexes, this
  form is easy to get right (and understand):

  ```js
  if (index < length) {
    // The invariant holds.
  } else {
    // The invariant doesn't hold.
  }
  ```

  This form is harder, and also goes against the grain of how `index` would typically be compared to
  `length`, for example, in a loop condition:

  ```js
  if (index >= length) {
    // It's not true that the invariant holds.
  }
  ```

- All errors must be handled. An [analysis of production failures in distributed data-intensive
  systems](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-yuan.pdf) found that
  the majority of catastrophic failures could have been prevented by simple testing of error
  handling code.

> “Specifically, we found that almost all (92%) of the catastrophic system failures are the result
> of incorrect handling of non-fatal errors explicitly signaled in software.”

- **Always motivate, always say why**. Never forget to say why. Because if you explain the rationale
  for a decision, it not only increases the hearer's understanding, and makes them more likely to
  adhere or comply, but it also shares criteria with them with which to evaluate the decision and
  its importance.

- **Explicitly pass options to library functions at the call site, instead of relying on the
  defaults**. For example, prefer `fetch(url, { method: 'POST', headers: {...} })` over `fetch(url)` when the specific options matter. This improves readability but most of all avoids latent, potentially catastrophic bugs in case the library ever changes its defaults.

## Performance

> “The lack of back-of-the-envelope performance sketches is the root of all evil.” — Rivacindela
> Hudsoni

- Think about performance from the outset, from the beginning. **The best time to solve performance,
  to get the huge 1000x wins, is in the design phase, which is precisely when we can't measure or
  profile.** It's also typically harder to fix a system after implementation and profiling, and the
  gains are less. So you have to have mechanical sympathy. Like a carpenter, work with the grain.

- **Perform back-of-the-envelope sketches with respect to the four resources (network, disk, memory,
  CPU) and their two main characteristics (bandwidth, latency).** Sketches are cheap. Use sketches
  to be “roughly right” and land within 90% of the global maximum.

- Optimize for the slowest resources first (network, disk, memory, CPU) in that order, after
  compensating for the frequency of usage, because faster resources may be used many times more. For
  example, a memory cache miss may be as expensive as a disk fsync, if it happens many times more.

- Distinguish between the control plane and data plane. A clear delineation between control plane
  and data plane through the use of batching enables a high level of assertion safety without losing
  performance. See our [July 2021 talk on Zig SHOWTIME](https://youtu.be/BH2jvJ74npM?t=1958) for
  examples.

- Amortize network, disk, memory and CPU costs by batching accesses.

- Let the CPU be a sprinter doing the 100m. Be predictable. Don't force the CPU to zig zag and
  change lanes. Give the CPU large enough chunks of work. This comes back to batching.

- Be explicit. Minimize dependence on the JavaScript engine to do the right thing for you.

  In particular, extract hot loops into stand-alone functions with primitive arguments.
  That way, the engine doesn't need to prove that it can optimize object property access, and a
  human reader can spot redundant computations easier.

### JavaScript-Specific Performance Considerations

**For Front-End Applications:**
- **Bundle size matters:** Every dependency adds to download time. Consider build-free approaches like JSDoc + TypeScript
- **DOM manipulation:** Batch DOM updates, use `requestAnimationFrame` for smooth animations
- **Event handling:** Debounce frequent events (keystrokes, scroll) to avoid excessive re-renders
- **Memory leaks:** Clean up event listeners, clear timers, avoid closures that capture large objects

```js
// Batch DOM updates for performance - functional approach
function createUIBatcher() {
  let updates = [];
  let pending = false;
  
  function scheduleUpdate(fn) {
    updates.push(fn);
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        updates.forEach(updateFn => updateFn());
        updates.length = 0;
        pending = false;
      });
    }
  }
  
  return { scheduleUpdate };
}
```

**For Node.js Back-End:**
- **I/O is the bottleneck:** Batch database queries, use connection pooling
- **Event loop blocking:** Avoid synchronous operations, use streaming for large data
- **Memory pressure:** Monitor heap usage, avoid keeping large objects in memory unnecessarily
- **Clustering:** Use multiple processes to utilize all CPU cores

```js
// Batch database operations - functional approach
function createQueryBatcher(db) {
  let batch = [];
  let timeout = null;
  
  async function flush() {
    const queries = batch.splice(0);
    timeout = null;
    return db.batch(queries);
  }
  
  function addQuery(query) {
    batch.push(query);
    if (!timeout) {
      timeout = setTimeout(() => flush(), 10);
    }
  }
  
  return { addQuery, flush };
}
```

**Resource Priority in JavaScript:**
1. **Network:** Reduce HTTP requests, use HTTP/2, implement proper caching
2. **Main thread:** Avoid blocking the event loop, use Web Workers for heavy computation  
3. **Memory:** Minimize object creation in hot paths, use object pooling if needed
4. **CPU:** Profile with DevTools, optimize algorithms rather than micro-optimizations

## Developer Experience

> “There are only two hard things in Computer Science: cache invalidation, naming things, and
> off-by-one errors.” — Phil Karlton

### Naming Things

- **Get the nouns and verbs just right.** Great names are the essence of great code, they capture
  what a thing is or does, and provide a crisp, intuitive mental model. They show that you
  understand the domain. Take time to find the perfect name, to find nouns and verbs that work
  together, so that the whole is greater than the sum of its parts.

- Use `camelCase` for function and variable names. Use `PascalCase` for constructor functions that return objects.

- Use `PascalCase` for types and Zod Schemas

- Do not abbreviate variable names, unless the variable is a primitive integer type used as an
  argument to a sort function or matrix calculation. Use long form arguments in scripts: `--force`,
  not `-f`. Single letter flags are for interactive usage.

- Use proper capitalization for acronyms (`VSRState`, not `VsrState`).

- For the rest, follow JavaScript/TypeScript community conventions.

- Add units or qualifiers to variable names, and put the units or qualifiers last, sorted by
  descending significance, so that the variable starts with the most significant word, and ends with
  the least significant word. For example, `latency_ms_max` rather than `max_latency_ms`. This will
  then line up nicely when `latency_ms_min` is added, as well as group all variables that relate to
  latency.

- When choosing related names, try hard to find names with the same number of characters so that
  related variables all line up in the source. For example, as arguments to a memcpy function,
  `source` and `target` are better than `src` and `dest` because they have the second-order effect
  that any related variables such as `source_offset` and `target_offset` will all line up in
  calculations and slices. This makes the code symmetrical, with clean blocks that are easier for
  the eye to parse and for the reader to check.

- When a single function calls out to a helper function or callback, prefix the name of the helper
  function with the name of the calling function to show the call history. For example,
  `read_sector()` and `read_sector_callback()`.

- Callbacks go last in the list of parameters. This mirrors control flow: callbacks are also
  _invoked_ last.

- _Order_ matters for readability (even if it doesn't affect semantics). On the first read, a file
  is read top-down, so put important things near the top. The `main` function goes first.

  At the same time, not everything has a single right order. When in doubt, consider sorting
  alphabetically, taking advantage of big-endian naming.

- Don't overload names with multiple meanings that are context-dependent. For example, TigerBeetle
  has a feature called _pending transfers_ where a pending transfer can be subsequently _posted_ or
  _voided_. At first, we called them _two-phase commit transfers_, but this overloaded the
  _two-phase commit_ terminology that was used in our consensus protocol, causing confusion.

- Think of how names will be used outside the code, in documentation or communication. For example,
  a noun is often a better descriptor than an adjective or present participle, because a noun can be
  directly used in correspondence without having to be rephrased. Compare `replica.pipeline` vs
  `replica.preparing`. The former can be used directly as a section header in a document or
  conversation, whereas the latter must be clarified. Noun names compose more clearly for derived
  identifiers, e.g. `config.pipeline_max`.

- **Write descriptive commit messages** that inform and delight the reader, because your commit
  messages are being read.

- Don't forget to say why. Code alone is not documentation. Use comments to explain why you wrote
  the code the way you did. Show your workings.

- Don't forget to say how. For example, when writing a test, think of writing a description at the
  top to explain the goal and methodology of the test, to help your reader get up to speed, or to
  skip over sections, without forcing them to dive in.

- Comments are sentences, with a space after the slash, with a capital letter and a full stop, or a
  colon if they relate to something that follows. Comments are well-written prose describing the
  code, not just scribblings in the margin. Comments after the end of a line _can_ be phrases, with
  no punctuation.

### Cache Invalidation

- Don't duplicate variables or take aliases to them. This will reduce the probability that state
  gets out of sync.



- **Shrink the scope** to minimize the number of variables at play and reduce the probability that
  the wrong variable is used.

- Calculate or check variables close to where/when they are used. **Don't introduce variables before
  they are needed.** Don't leave them around where they are not. This will reduce the probability of
  a POCPOU (place-of-check to place-of-use), a distant cousin to the infamous
  [TOCTOU](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use). Most bugs come down to a
  semantic gap, caused by a gap in time or space, because it's harder to check code that's not
  contained along those dimensions.

- Use simpler function signatures and return types to reduce dimensionality at the call site, the
  number of branches that need to be handled at the call site, because this dimensionality can also
  be viral, propagating through the call chain. For example, as a return type, `void` trumps `boolean`,
  `boolean` trumps `number`, `number` trumps `number | null`, and `number | null` trumps `number | null | Error`.

- Ensure that functions run to completion without suspending, so that precondition assertions are
  true throughout the lifetime of the function. These assertions are useful documentation without a
  suspend, but may be misleading otherwise.



- Use newlines to **group resource allocation and cleanup**, i.e. before the resource
  allocation and after the corresponding cleanup code, to make leaks easier to spot.

### Off-By-One Errors

- **The usual suspects for off-by-one errors are casual interactions between an `index`, a `count`
  or a `size`.** These are all primitive integer types, but should be seen as distinct types, with
  clear rules to cast between them. To go from an `index` to a `count` you need to add one, since
  indexes are _0-based_ but counts are _1-based_. To go from a `count` to a `size` you need to
  multiply by the unit. Again, this is why including units and qualifiers in variable names is
  important.

- Show your intent with respect to division. For example, use `Math.floor()`, `Math.ceil()` or
  explicit rounding to show the reader you've thought through all the interesting scenarios where
  rounding may be involved.

### Style By The Numbers

- Use consistent formatting (Prettier or similar).

- Use 4 spaces of indentation, rather than 2 spaces, as that is more obvious to the eye at a
  distance.

- Hard limit all line lengths, without exception, to at most 100 columns for a good typographic
  "measure". Use it up. Never go beyond. Nothing should be hidden by a horizontal scrollbar. Let
  your editor help you by setting a column ruler. To wrap a function signature, call or data
  structure, add a trailing comma and let your formatter handle the rest.

- Add braces to the `if` statement unless it fits on a single line for consistency and defense in
  depth against "goto fail;" bugs.

### Dependencies

Adopt **a "minimal dependencies" policy** for JavaScript projects. Dependencies, in
general, inevitably lead to supply chain attacks, safety and performance risk, and slow install
times. For foundational infrastructure in particular, the cost of any dependency is further
amplified throughout the rest of the stack.

**Dependency Evaluation Framework:**

Before adding any dependency, ask:
1. **Is this something small I can implement myself?** For utilities like debouncing, deep cloning, or date formatting, consider writing a focused implementation
2. **What's the true cost?** Check bundle size, number of transitive dependencies, and maintenance burden
3. **Is this well-justified?** Use libraries for complex domains (React for UI, Express for servers) but avoid them for trivial tasks

**Examples of Good vs. Questionable Dependencies:**

```js
// ✅ Good: Complex, well-maintained, solves hard problems
import React from 'react';
import express from 'express';
import zod from 'zod';

// ❓ Questionable: Simple utilities you could write yourself
import { debounce } from 'lodash'; // vs. writing 5 lines of debounce
import leftPad from 'left-pad';    // vs. String.prototype.padStart()
import isNumber from 'is-number';  // vs. typeof x === 'number'
```

**Dependency Hygiene:**
```js
// Regular dependency audit
npm audit
npm outdated

// Lock dependency versions in production
npm ci  # instead of npm install

// Monitor bundle size impact
npx bundlesize

// Consider build-free alternatives
// Instead of full TypeScript compilation:
// Use JSDoc + TypeScript checking with jsconfig.json
```

**When working with AI assistants:** AIs often suggest popular packages because they appear frequently in training data. Always ask: *"Is there a simpler way to achieve this without an external library?"* The AI can often provide a lightweight custom solution.

**Well-Justified Testing Dependencies:**
Some dependencies align perfectly with Tiger Style principles:

```js
// ✅ Excellent: Focused, reliable, widely adopted
import { setupServer } from 'msw/node';     // Network-level API mocking
import { z } from 'zod';                    // Runtime type validation
import { describe, test, expect } from 'vitest'; // Fast, modern test runner

// ✅ Good: Specialized tools for specific domains  
import { screen, userEvent } from '@testing-library/react'; // DOM testing utilities
import '@testing-library/jest-dom/vitest';  // Extended matchers for DOM testing
```

These tools earn their place by solving hard problems correctly and providing deterministic, reusable solutions that align with Tiger Style's emphasis on safety and correctness.

### Tooling

Similarly, tools have costs. A small standardized toolbox is simpler to operate than an array of
specialized instruments each with a dedicated manual. Our primary tool is JavaScript/TypeScript. It may not be the
best for everything, but it's good enough for most things. We invest into our JavaScript tooling to ensure
that we can tackle new problems quickly, with a minimum of accidental complexity in our local
development environment.

> “The right tool for the job is often the tool you are already using—adding new tools has a higher
> cost than many people appreciate” — John Carmack

For example, the next time you write a script, instead of `scripts/*.sh`, write `scripts/*.js` or `scripts/*.ts`.

This not only makes your script cross-platform and portable, but introduces type safety (with TypeScript) and
increases the probability that running your script will succeed for everyone on the team, instead of
hitting a Bash/Shell/OS-specific issue.

Standardizing on JavaScript/TypeScript for tooling is important to ensure that we reduce dimensionality, as the team,
and therefore the range of personal tastes, grows. This may be slower for you in the short term, but
makes for more velocity for the team in the long term.

**Prefer Functional Programming Patterns:**
Use factory functions that return objects with methods instead of classes. This approach:
- Eliminates `this` binding confusion
- Makes testing easier (no need to `new` up instances)
- Provides better encapsulation through closures
- Aligns with functional programming principles for better predictability

```js
// ✅ Preferred: Factory function
function createUserService(database) {
  async function getUser(id) {
    // Private variables are truly private via closure
    const user = await database.users.findById(id);
    return user;
  }
  
  return { getUser };
}

// ❌ Avoid: Class-based approach
class UserService {
  constructor(database) {
    this.database = database; // Exposed property
  }
  
  async getUser(id) {
    // Potential 'this' binding issues
    return this.database.users.findById(id);
  }
}
```

## Tiger Style with AI Coding Assistants

Modern developers increasingly use AI coding agents (GitHub Copilot, Cursor, Claude, etc.) as "pair programmers" to accelerate development. The challenge is integrating Tiger Style values into an AI-assisted workflow. Here's how to apply Tiger Style principles when working with AI assistants:

### Defensive Programming with AI

AI assistants can accelerate development, but they also tend to produce code that **looks correct** at first glance yet might be brittle in edge cases. Studies have found that using AI assistants can lead to more errors slipping in when developers blindly trust the output.

**Treat the AI like a junior developer who "hasn't learned when to say 'I don't know'":**

- **Always guide the AI to include robust error handling:** Instead of accepting a quick solution, ask: *"Add input validation and sanity checks"*
- **Use AI to brainstorm failure modes:** Ask *"What are some edge cases or ways this function could fail?"* The AI can enumerate scenarios you hadn't considered
- **Never ignore returned errors:** If an AI suggests code that ignores a promise rejection or uses empty catch blocks, explicitly ask it to handle that case
- **Program the negative space with AI help:** Ask the AI to generate test cases that intentionally feed bad data to your functions

```js
// Instead of accepting this AI-generated code:
function processUser(user) {
  return user.name.toUpperCase();
}

// Guide the AI to produce defensive code:
function processUser(user) {
  if (!user) {
    throw new Error('User is required');
  }
  if (typeof user.name !== 'string') {
    throw new Error(`Expected user.name to be string, got ${typeof user.name}`);
  }
  return user.name.toUpperCase();
}
```

### Performance-First Engineering with AI

**Plan performance budget early with AI assistance:**
- Ask the AI for complexity analysis: *"What's the time complexity of this algorithm?"*
- Request architectural advice: *"How can I implement a batching mechanism for incoming requests to improve throughput?"*
- Use AI to suggest optimizations: *"This JSON serialization is slow, how can I optimize it?"*

**Beware of premature micro-optimizations from AI:** AI training data includes lots of low-level optimization lore. Sometimes it might suggest micro-optimizations that complicate code without real benefit. Focus on **architectural** wins (100x gains from design), not millisecond shaving.

### Iterative Development with AI

Resist the temptation to have the AI generate a whole feature in one go. Use **tight feedback loops:**

1. **Step-by-step development:** Ask for route handler stub first, run tests, then implement logic incrementally
2. **TDD with AI:** Generate tests first, run them (they fail), then implement to make them pass
3. **Immediate explanations:** Ask the AI to document as it goes: *"Explain the approach you used in comments"*
4. **Real-time validation:** When using AI-powered IDEs, address suggestions immediately rather than ignoring until later

### Correctness Through Design with AI

**Use AI as a design collaborator:**
- Describe your intended module in natural language and ask for API suggestions
- Ask for high-level architecture review: *"Is there any scenario where this caching mechanism might break?"*
- Generate type definitions: *"Define a TypeScript interface for a Transaction object with these constraints..."*
- Formalize state machines: *"List all possible states of this form and how you can transition between them"*

**Example: Using AI for design validation:**
```js
// Ask AI to review this design:
// "Here's my plan for how the caching mechanism will work in this web app. 
// Is there any scenario where it might break or not hold true to the design?"

function createUserCache() {
  const cache = new Map();
  const ttl = 5 * 60 * 1000; // 5 minutes
  
  function get(userId) {
    const entry = cache.get(userId);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(userId);
      return null;
    }
    
    return entry.data;
  }
  
  function set(userId, data) {
    cache.set(userId, {
      data,
      timestamp: Date.now()
    });
  }
  
  return { get, set };
}
```

### Testing Strategy with AI

**Generate comprehensive test cases:**
- Ask for edge cases: *"Generate a list of diverse test inputs for this function, including edge cases and invalid data"*
- Create simulation tests: *"Write a test that simulates 50 concurrent requests to this API"*
- Generate property-based tests: *"Generate multiple random inputs to test this function, but use a fixed seed so the test is deterministic"*

```js
import { describe, expect, test } from 'vitest';

// AI can help generate exhaustive test scenarios:
describe('processTransfer', () => {
  test('handles valid transfers', () => {
    // AI generates normal case
  });
  
  test('rejects negative amounts', () => {
    // AI generates edge case testing
  });
  
  test('handles concurrent transfers on same account', () => {
    // AI generates concurrency test
  });
  
  test('maintains account balance invariants', () => {
    // AI generates property-based test
  });
});
```

### Tiger Style vs Traditional AI-Assisted Development

| **Aspect** | **Traditional AI Approach** | **Tiger Style with AI** |
|------------|------------------------------|--------------------------|
| **AI Usage** | Accept AI output as-is, treat as infallible oracle | Treat AI as junior developer needing supervision |
| **Error Handling** | May accept code that ignores errors for simplicity | Explicitly ask AI to handle all error cases |
| **Design Phase** | Jump into coding with AI generation | Use AI to brainstorm and validate design upfront |
| **Testing** | Generate basic tests for main functionality | Ask AI for comprehensive edge cases and failure modes |
| **Performance** | "Optimize later" mentality | Ask AI for complexity analysis and architectural guidance |
| **Code Review** | Little validation beyond "it runs" | Evaluate all AI contributions under Tiger Style principles |

By consciously applying Tiger Style principles with AI co-development, you get the best of both: uncompromising quality of systems programming practices, and the rapid development cycle that modern AI tools offer.

## Practical Examples

### Front-End Example: Financial Portfolio Dashboard

**Scenario:** Building a single-page web application for financial portfolio tracking with Tiger Style principles and AI assistance.

**Defensive UI Programming:**
```js
/**
 * @param {number} amount - Transfer amount
 * @param {number} balance - Current account balance  
 * @returns {string|null} Error message or null if valid
 */
function validateTransfer(amount, balance) {
  // AI-generated with explicit guidance for edge cases
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Amount must be a valid number';
  }
  if (amount <= 0) {
    return 'Amount must be positive';
  }
  if (amount > balance) {
    return 'Insufficient funds';
  }
  if (!Number.isFinite(amount)) {
    return 'Amount must be finite';
  }
  return null;
}

// In development mode, assert invariants
function updateAccountBalance(accountId, newBalance) {
  if (process.env.NODE_ENV === 'development') {
    console.assert(newBalance >= 0, 
      `Balance cannot be negative: ${newBalance}`);
  }
  // Update UI...
}
```

**Performance and Determinism:**
```js
// Batch DOM updates using requestAnimationFrame - functional approach
function createPortfolioRenderer() {
  const pendingUpdates = new Set();
  let updateScheduled = false;
  
  function renderAccount(accountId) {
    // DOM rendering logic for account
    const element = document.getElementById(`account-${accountId}`);
    if (element) {
      // Update account display
    }
  }
  
  function flushUpdates() {
    for (const accountId of pendingUpdates) {
      renderAccount(accountId);
    }
    pendingUpdates.clear();
    updateScheduled = false;
  }
  
  function scheduleUpdate(accountId) {
    pendingUpdates.add(accountId);
    if (!updateScheduled) {
      updateScheduled = true;
      requestAnimationFrame(() => flushUpdates());
    }
  }
  
  return { scheduleUpdate };
}
```

### Back-End Example: Node.js Ledger API

**Scenario:** A Node.js service handling account credits and debits with Tiger Style principles.

**Defensive Server Programming:**
```js
const transferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().positive()
});

async function processTransfer(req, res) {
  try {
    // Validate input with Zod
    const transfer = transferSchema.parse(req.body);
    
    // Business logic assertions
    console.assert(transfer.fromAccountId !== transfer.toAccountId,
      'Cannot transfer to same account');
    
    // Execute in transaction for atomicity
    await db.transaction(async (trx) => {
      const fromAccount = await trx('accounts')
        .where('id', transfer.fromAccountId)
        .first();
      
      console.assert(fromAccount, 
        `Account ${transfer.fromAccountId} not found`);
      console.assert(fromAccount.balance >= transfer.amount,
        `Insufficient funds: ${fromAccount.balance} < ${transfer.amount}`);
      
      // Update balances atomically
      await trx('accounts')
        .where('id', transfer.fromAccountId)
        .decrement('balance', transfer.amount);
        
      await trx('accounts')
        .where('id', transfer.toAccountId)
        .increment('balance', transfer.amount);
      
      // Log transaction for audit trail
      await trx('transactions').insert({
        from_account: transfer.fromAccountId,
        to_account: transfer.toAccountId,
        amount: transfer.amount,
        timestamp: new Date()
      });
    });
    
    res.json({ success: true });
  } catch (error) {
    // All errors are handled explicitly
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    
    console.error('Transfer failed:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
```

**Data Integrity with Double-Entry Bookkeeping:**
```js
// AI-generated with guidance for financial correctness
async function validateLedgerIntegrity() {
  const totalCredits = await db('ledger_entries')
    .where('type', 'credit')
    .sum('amount as total');
    
  const totalDebits = await db('ledger_entries')
    .where('type', 'debit')
    .sum('amount as total');
  
  console.assert(
    Math.abs(totalCredits.total - totalDebits.total) < 0.01,
    `Ledger out of balance: credits=${totalCredits.total}, debits=${totalDebits.total}`
  );
}

// Run integrity check in tests and development
if (process.env.NODE_ENV !== 'production') {
  setInterval(validateLedgerIntegrity, 60000); // Every minute
}
```

These examples show how Tiger Style principles guide every step: from ensuring user inputs are handled safely and state transitions are well-defined, to optimizing rendering performance and keeping the codebase clean. The AI assistant accelerates each step but **we apply the Tiger Style lens** to ensure safety, performance, and simplicity are never compromised.

## The Last Stage

At the end of the day, keep trying things out, have fun, and remember—it's called TigerBeetle, not
only because it's fast, but because it's small!

> You don’t really suppose, do you, that all your adventures and escapes were managed by mere luck,
> just for your sole benefit? You are a very fine person, Mr. Baggins, and I am very fond of you;
> but you are only quite a little fellow in a wide world after all!”
>
> “Thank goodness!” said Bilbo laughing, and handed him the tobacco-jar.

## Assertion Examples (TypeScript)

Here are some examples illustrating the assertion principles in TypeScript:

```typescript
// Use named assert import for better tree-shaking
import { assert } from '@sindresorhus/is';
import { z } from 'zod'

/**
 * Example function demonstrating argument and precondition asserts.
 * Uses @sindresorhus/is for robust type assertions.
 *
 * @param options The options object.
 * @param options.userId The user ID (must be positive).
 * @param options.amount The amount (must be positive).
 * @returns The new balance (guaranteed positive).
 */
function processTransaction(options: {
  userId: number;
  amount: number;
}): number {
  // Assert arguments (preconditions) using built-in checkers
  z.object({
    userId: z.number().positive({
      message: `userId must be positive, got ${options.userId}`
    }),
    amount: z.number().positive({
      message: `amount must be positive, got ${options.amount}`
    }),
  })
  .refine((data) => isValidUserId(data.userId), {
    message: `User ID ${options.userId} is invalid`,
  })
  .refine((data) => hasSufficientFunds(data.userId, data.amount), {
    message: `User ${options.userId} lacks funds for ${options.amount}`,
    // Path can be specified for better error reporting if needed
    // path: ['amount'],
  })
  .parse(options); // Use parse to validate

  // Simulate fetching balance (replace with actual logic)
  const currentBalance = 100; // Assume fetched balance
  // Check invariants
  assert.positiveNumber(
    currentBalance,
    `Invariant failed: currentBalance ${currentBalance} is not positive`,
  );

  const newBalance = currentBalance - options.amount;

  // Assert postcondition
  // Check both positive and negative space
  assert.truthy(
    newBalance >= 0,
    `Postcondition failed: newBalance ${newBalance} cannot be negative`,
  );
  assert.truthy(
    newBalance < currentBalance,
    `Postcondition failed: newBalance ${newBalance} not less than currentBalance ${currentBalance}`,
  );

  // Split compound assertions for clarity and better error messages
  // These checks are now handled by the Zod schema refinements above.

  // Paired Assertion Concept (Conceptual Example):
  // These would use specific assertions based on data structure
  // Assert data validity before writing
  assertValidDataForStorage(data);
  writeDataToDisk(data);
  // ... later ...
  const readData = readDataFromDisk();
  // Assert data validity immediately after reading
  assertValidDataFromStorage(readData);

  // Assert return value type/condition
  assert.positiveNumber(
    newBalance,
    `Return value: newBalance ${newBalance} must be positive`
  );
  return newBalance;
}

// Helper functions (stubs for example)
function isValidUserId(id: number): boolean {
  // Example validation
  return id > 0 && Number.isInteger(id);
}
function hasSufficientFunds(
  userId: number,
  amount: number,
): boolean {
  // Example check - ensure parameters are valid numbers first
  assert.positiveNumber(userId, 'userId in hasSufficientFunds');
  assert.positiveNumber(amount, 'amount in hasSufficientFunds');
  return true; // Replace with actual fund checking logic
}

// Assume these exist and perform necessary checks
declare const data: unknown; // Use unknown for safety
function assertValidDataForStorage(
  data: unknown
): asserts data is { /* expected shape */ } {
  // Use specific asserts: assert.plainObject, assert.string, etc.
  assert.plainObject(data, 'Data for storage must be an object');
  // ... more checks
}
function writeDataToDisk(data: { /* expected shape */ }): void {
  /* write */
}
function readDataFromDisk(): unknown {
  return {}; /* read */
}
function assertValidDataFromStorage(
  data: unknown
): asserts data is { /* expected shape */ } {
  // Use specific asserts: assert.plainObject, assert.string, etc.
  assert.plainObject(data, 'Data from storage must be an object');
  // ... more checks
}
```



## @sindresorhus/is API

Here is a list of the methods available with the `assert.{method}()` syntax, categorized as they appear in the documentation:

**Primitives:**

*   `assert.undefined(value, message?)`
*   `assert.null(value, message?)`
*   `assert.string(value, message?)`
*   `assert.number(value, message?)`
*   `assert.boolean(value, message?)`
*   `assert.symbol(value, message?)`
*   `assert.bigint(value, message?)`

**Built-in types:**

*   `assert.array(value, assertion?, message?)`
*   `assert.function(value, message?)`
*   `assert.buffer(value, message?)`
*   `assert.blob(value, message?)`
*   `assert.object(value, message?)`
*   `assert.numericString(value, message?)`
*   `assert.regExp(value, message?)`
*   `assert.date(value, message?)`
*   `assert.error(value, message?)`
*   `assert.nativePromise(value, message?)`
*   `assert.promise(value, message?)`
*   `assert.generator(value, message?)`
*   `assert.generatorFunction(value, message?)`
*   `assert.asyncFunction(value, message?)`
*   `assert.asyncGenerator(value, message?)`
*   `assert.asyncGeneratorFunction(value, message?)`
*   `assert.boundFunction(value, message?)`
*   `assert.map(value, message?)`
*   `assert.set(value, message?)`
*   `assert.weakMap(value, message?)`
*   `assert.weakSet(value, message?)`
*   `assert.weakRef(value, message?)`

**Typed arrays:**

*   `assert.int8Array(value, message?)`
*   `assert.uint8Array(value, message?)`
*   `assert.uint8ClampedArray(value, message?)`
*   `assert.int16Array(value, message?)`
*   `assert.uint16Array(value, message?)`
*   `assert.int32Array(value, message?)`
*   `assert.uint32Array(value, message?)`
*   `assert.float32Array(value, message?)`
*   `assert.float64Array(value, message?)`
*   `assert.bigInt64Array(value, message?)`
*   `assert.bigUint64Array(value, message?)`

**Structured data:**

*   `assert.arrayBuffer(value, message?)`
*   `assert.sharedArrayBuffer(value, message?)`
*   `assert.dataView(value, message?)`
*   `assert.enumCase(value, enum, message?)` (TypeScript-only)
*   `assert.typedArray(value, message?)`
*   `assert.arrayLike(value, message?)`
*   `assert.tupleLike(value, guards, message?)`
*   `assert.positiveNumber(value, message?)`
*   `assert.negativeNumber(value, message?)`
*   `assert.inRange(value, range, message?)`
*   `assert.htmlElement(value, message?)`
*   `assert.nodeStream(value, message?)`
*   `assert.observable(value, message?)`
*   `assert.infinite(value, message?)`
*   `assert.evenInteger(value, message?)`
*   `assert.oddInteger(value, message?)`
*   `assert.propertyKey(value, message?)`
*   `assert.formData(value, message?)`
*   `assert.urlSearchParams(value, message?)`
*   `assert.validDate(value, message?)`



## Zod API


Based on the Zod documentation, here are the schema creation and manipulation methods available directly under the `z` namespace or as chainable methods on existing schemas:

**Primitive Types:**

*   `z.string(params?)`: Creates a string schema. `params` allows customizing error messages.
*   `z.number(params?)`: Creates a number schema. `params` allows customizing error messages.
*   `z.bigint(params?)`: Creates a bigint schema. `params` allows customizing error messages.
*   `z.boolean(params?)`: Creates a boolean schema. `params` allows customizing error messages.
*   `z.nan(params?)`: Creates a NaN schema. `params` allows customizing error messages.
*   `z.undefined()`: Creates an undefined schema.
*   `z.null()`: Creates a null schema.
*   `z.any()`: Creates a schema that accepts any value.
*   `z.unknown()`: Creates a schema that accepts any value but requires validation before use (safer than `any`).
*   `z.void()`: Creates a schema that accepts `undefined` and has `void` as its output type.
*   `z.never()`: Creates a schema that accepts no values.

**Complex Types:**

*   `z.object(shape)`: Creates an object schema with a defined `shape`.
*   `z.array(schema)`: Creates an array schema where elements match the provided `schema`.
*   `z.union([schemaA, schemaB, ...])`: Creates a schema that accepts values matching *any* of the provided schemas.
*   `z.intersection(schemaA, schemaB)`: Creates a schema that accepts values matching *both* schemaA and schemaB.
*   `z.tuple([schemaA, schemaB, ...])`: Creates a tuple schema with fixed element types.
*   `z.record(keySchema, valueSchema)`: Creates an object schema with keys matching `keySchema` and values matching `valueSchema`.
*   `z.map(keySchema, valueSchema)`: Creates a Map schema.
*   `z.set(valueSchema)`: Creates a Set schema.
*   `z.function(args?, return?)`: Creates a function schema, validating arguments and/or return type.
*   `z.promise(schema)`: Creates a Promise schema where the resolved value matches the provided `schema`.
*   `z.enum([val1, val2, ...])`: Creates a schema accepting only the provided literal string values.
*   `z.nativeEnum(enumObject)`: Creates a schema based on a TypeScript enum object.
*   `z.literal(value)`: Creates a schema accepting only the specific literal `value`.

**Schema Modifiers/Methods (Chainable):**

*   `.optional()`: Makes the schema accept `undefined`. Returns `ZodOptional`.
*   `.nullable()`: Makes the schema accept `null`. Returns `ZodNullable`.
*   `.nullish()`: Makes the schema accept `null` or `undefined` (shortcut for `.nullable().optional()`). Returns `ZodOptional<ZodNullable>`.
*   `.array()`: Creates an array schema of the current type (e.g., `z.string().array()` is `z.array(z.string())`). Returns `ZodArray`.
*   `.promise()`: Creates a promise schema of the current type (e.g., `z.string().promise()` is `z.promise(z.string())`). Returns `ZodPromise`.
*   `.or(otherSchema)`: Creates a union with another schema (e.g., `z.string().or(z.number())`). Returns `ZodUnion`.
*   `.and(otherSchema)`: Creates an intersection with another schema (e.g., `z.object({a: z.string()}).and(z.object({b: z.number()}))`). Returns `ZodIntersection`.
*   `.transform(func)`: Adds a transformation step after parsing. Returns `ZodEffects`.
*   `.refine(validator, params?)`: Adds a custom validation rule. Returns `ZodEffects`.
*   `.superRefine(validator)`: Advanced refinement allowing multiple issues/custom codes. Returns `ZodEffects`.
*   `.brand<T>()`: Adds a unique brand to the type for nominal typing simulation. Returns `ZodBranded`.
*   `.default(value)`: Provides a default value if the input is `undefined`.
*   `.catch(value)`: Provides a fallback value if parsing fails.
*   `.describe(description)`: Adds a description (metadata).
*   `.pipe(otherSchema)`: Chains parsing: output of the first schema is input to the second.
*   `.readonly()`: Marks the inferred type as `readonly`.
*   `.parse(data)`: Parses data, throwing a `ZodError` on failure.
*   `.safeParse(data)`: Parses data, returning a result object (`{ success: true, data: T } | { success: false, error: ZodError }`).
*   `.parseAsync(data)`: Parses data using async refinements/transforms.
*   `.safeParseAsync(data)`: Safely parses data using async refinements/transforms.

**Number Specific Methods (Chainable on `z.number()`):**

*   `.gt(value, message?)`: Greater than `value`.
*   `.gte(value, message?)` / `.min(value, message?)`: Greater than or equal to `value`.
*   `.lt(value, message?)`: Less than `value`.
*   `.lte(value, message?)` / `.max(value, message?)`: Less than or equal to `value`.
*   `.int(message?)`: Must be an integer.
*   `.positive(message?)`: Must be > 0.
*   `.nonnegative(message?)`: Must be >= 0.
*   `.negative(message?)`: Must be < 0.
*   `.nonpositive(message?)`: Must be <= 0.
*   `.multipleOf(value, message?)`: Must be a multiple of `value`.
*   `.finite(message?)`: Must be finite (not `Infinity` or `-Infinity`).
*   `.safe(message?)`: Must be a safe integer (`Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`).

**BigInt Specific Methods (Chainable on `z.bigint()`):**

*   `.gt(value, message?)`
*   `.gte(value, message?)` / `.min(value, message?)`
*   `.lt(value, message?)`
*   `.lte(value, message?)` / `.max(value, message?)`
*   `.positive(message?)`
*   `.nonnegative(message?)`
*   `.negative(message?)`
*   `.nonpositive(message?)`
*   `.multipleOf(value, message?)`

**String Specific Methods (Chainable on `z.string()`):**

*   `.min(length, message?)`: Minimum length.
*   `.max(length, message?)`: Maximum length.
*   `.length(length, message?)`: Exact length.
*   `.email(message?)`
*   `.url(message?)`
*   `.emoji(message?)`
*   `.uuid(message?)`
*   `.cuid(message?)`
*   `.cuid2(message?)`
*   `.ulid(message?)`
*   `.regex(regex, message?)`
*   `.includes(value, message?)`
*   `.startsWith(value, message?)`
*   `.endsWith(value, message?)`
*   `.datetime(options?)`: ISO 8601 Datetime string.
*   `.ip(options?)`: IP address string.
*   `.trim()`: Trims whitespace before validation.
*   `.toLowerCase()`: Converts to lowercase before validation.
*   `.toUpperCase()`: Converts to uppercase before validation.

**Object Specific Methods (Chainable on `z.object()`):**

*   `.extend(shape)`: Adds new fields to the object schema.
*   `.merge(otherObjectSchema)`: Merges with another object schema.
*   `.pick({ key1: true, key2: true, ... })`: Creates a new schema with only the specified keys.
*   `.omit({ key1: true, key2: true, ... })`: Creates a new schema without the specified keys.
*   `.partial()`: Makes all fields optional.
*   `.deepPartial()`: Makes all fields (including nested objects) optional.
*   `.required()`: Makes all fields required.
*   `.passthrough()`: Allows extra keys not defined in the schema.
*   `.strict()`: Disallows extra keys.
*   `.strip()`: Strips extra keys (default behavior).
*   `.catchall(valueSchema)`: Allows any extra keys, validating their values against `valueSchema`.

**Array Specific Methods (Chainable on `z.array()`):**

*   `.min(length, message?)`: Minimum array length.
*   `.max(length, message?)`: Maximum array length.
*   `.length(length, message?)`: Exact array length.
*   `.nonempty(message?)`: Equivalent to `.min(1)`.

This list covers the core schema types and common methods mentioned or implied in the provided documentation snippets. Zod has even more specialized methods, but these are the fundamental building blocks.
