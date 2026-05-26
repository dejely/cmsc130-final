# K-Map made Easy

A browser-based Boolean simplification tool built with React, TypeScript, Vite, Tailwind CSS, and shadcn-style UI components.

The app accepts 2- to 4-variable minterms and optional don't-care terms, then generates:

- Truth table
- Karnaugh Map layout
- Quine-McCluskey tabulation steps
- Simplified SOP expression
- Simplified POS expression
- Verilog combinational circuit code
- Built-in Verilog examples for a 2:1 multiplexer and 1-bit full adder

## Running the Project

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## User Workflow

1. Choose the number of variables: `2`, `3`, or `4`.
2. Enter minterms as comma- or space-separated numbers.
3. Optionally enter don't-care terms.
4. The app validates the input.
5. If valid, the app computes:
   - truth table values
   - K-map cells
   - SOP simplification
   - POS simplification
   - tabulation rounds
   - selected prime implicants
   - Verilog output

Example:

```text
Variables: 2
Minterms: 1, 3
Don't-cares:
```

Expected SOP:

```text
B
```

Expected Verilog:

```verilog
module boolean_solver(A, B, Y);
  input A, B;
  output Y;

  assign Y = B;
endmodule
```

## Project Structure

```text
src/
  App.tsx
  solver.ts
  main.tsx
  index.css
  data/
    circuit-examples.ts
  components/
    solver/
      app-header.tsx
      code-block.tsx
      empty-state.tsx
      example-modules.tsx
      expression-card.tsx
      generated-verilog-card.tsx
      input-panel.tsx
      kmap-panel.tsx
      section-title.tsx
      solution-sections.tsx
      tabulation-view.tsx
      truth-table.tsx
    ui/
      alert.tsx
      badge.tsx
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      select.tsx
      table.tsx
  lib/
    utils.ts
```

## Frontend Documentation

### `src/App.tsx`

`App.tsx` is the main state and composition layer. It does not contain the actual minimization algorithm.

It manages:

- selected variable count
- variable names
- minterm text input
- don't-care text input
- active built-in example
- parsed input
- validation errors
- computed solver result
- generated custom Verilog module

Main solver calls:

- `parseTermList(...)` parses minterms and don't-cares.
- `validateTerms(...)` checks minterm/don't-care overlap.
- `solveBooleanFunction(...)` computes the truth table, K-map, SOP, and POS.
- `generateVerilogModule(...)` converts the SOP result into Verilog.

### `src/components/solver/input-panel.tsx`

Renders the user input controls:

- variable count selector
- variable badges
- minterm input
- don't-care input
- validation/ready alert
- built-in example buttons

This component only collects input. It does not solve Boolean expressions directly. It calls callbacks passed from `App.tsx`.

### `src/components/solver/kmap-panel.tsx`

Renders the K-map card.

Responsibilities:

- displays the Gray-code K-map table
- labels rows and columns
- shows each cell's minterm index
- marks values as `1`, `0`, or `X`
- tags cells covered by selected SOP implicants as `G1`, `G2`, etc.

The K-map data comes from `solution.kmap`, which is produced in `solver.ts`.

### `src/components/solver/expression-card.tsx`

Displays one simplified expression card.

Used for:

- SOP result
- POS result

It shows:

- final expression
- selected implicant groups
- Verilog expression equivalent

### `src/components/solver/truth-table.tsx`

Renders the full truth table for the selected number of variables.

Values:

- `1` means the index is a minterm.
- `0` means the output is false.
- `X` means the index is a don't-care.

### `src/components/solver/tabulation-view.tsx`

Renders Quine-McCluskey step-by-step details.

It displays:

- initial groups by number of `1` bits
- combined terms per round
- prime candidates
- final prime implicants
- selected implicants

There are two instances:

- SOP tabulation
- POS tabulation

### `src/components/solver/generated-verilog-card.tsx`

Shows the generated Verilog module for the current custom input.

The app uses the SOP expression for the generated `assign` statement.

### `src/components/solver/example-modules.tsx`

Shows the built-in combinational circuit examples:

- `mux_2_to_1`
- `full_adder_1bit`

For each example, the component calls `solveBooleanFunction(...)` and then generates Verilog using `generateVerilogModule(...)`.

### `src/data/circuit-examples.ts`

Stores built-in example definitions.

Each example includes:

- title
- description
- Verilog module name
- variable count
- variable names
- one or more outputs with minterm lists

Current examples:

```text
2:1 Multiplexer
Variables: S, D0, D1
Y minterms: 2, 3, 5, 7
```

```text
1-bit Full Adder
Variables: A, B, Cin
sum minterms: 1, 2, 4, 7
carry minterms: 3, 5, 6, 7
```

### `src/components/ui/*`

Local shadcn-style UI primitives used by the app.

These include:

- `Button`
- `Input`
- `Label`
- `Card`
- `Badge`
- `Alert`
- `Select`
- `Table`

They are project-local components, not imported from a package at runtime.

### `src/lib/utils.ts`

Defines `cn(...)`, the standard shadcn utility for merging class names:

```ts
cn('base-class', condition && 'conditional-class')
```

It combines `clsx` and `tailwind-merge`.

### `src/index.css`

Defines Tailwind CSS and shadcn-compatible CSS variables.

It contains:

- Tailwind import
- theme token mapping
- color variables
- radius variables
- global base styles

## Solver Documentation

All solving logic is in `src/solver.ts`.

The frontend calls this file, but the solver itself is UI-independent. That means the algorithm can be reused in tests, a CLI, or another interface.

### Core Types

#### `VariableCount`

```ts
export type VariableCount = 2 | 3 | 4
```

Limits the solver to 2, 3, or 4 variables.

#### `CellValue`

```ts
export type CellValue = '0' | '1' | 'X'
```

Represents a truth table or K-map cell:

- `1`: minterm
- `0`: zero term
- `X`: don't-care

#### `ExpressionMode`

```ts
export type ExpressionMode = 'sop' | 'pos'
```

Tells formatting and simplification functions whether they are working with Sum of Products or Product of Sums.

#### `Implicant`

```ts
export interface Implicant {
  pattern: string
  terms: number[]
}
```

Represents a simplified group.

Example:

```ts
{
  pattern: '1-0',
  terms: [4, 6]
}
```

Pattern meaning:

- `1`: variable appears normally in SOP
- `0`: variable appears complemented in SOP
- `-`: variable is eliminated

#### `TabulationRound`

Stores one Quine-McCluskey round:

- grouped implicants
- successful combinations
- carried prime candidates

This is what powers the step-by-step tabulation UI.

#### `SimplificationResult`

Returned for both SOP and POS.

Includes:

- target terms
- don't-cares
- prime implicants
- selected implicants
- tabulation rounds
- display expression
- Verilog expression
- constant result, if applicable

#### `SolveResult`

The full output from `solveBooleanFunction(...)`.

Includes:

- input metadata
- zeros
- truth table
- K-map
- SOP simplification result
- POS simplification result

## Solver Flow

The main entrypoint is:

```ts
solveBooleanFunction(variableCount, variableNames, minterms, dontCares)
```

It performs these steps:

1. Creates the universe of possible indices.
   - 2 variables: `0-3`
   - 3 variables: `0-7`
   - 4 variables: `0-15`
2. Converts minterms and don't-cares into `Set`s for quick lookup.
3. Derives zero terms.
4. Builds the truth table.
5. Builds the K-map layout.
6. Simplifies SOP.
7. Simplifies POS.
8. Returns a single `SolveResult`.

## Input Parsing and Validation

### `parseTermList(...)`

Parses user input like:

```text
1, 3, 7
```

or:

```text
1 3 7
```

It checks:

- each token is a whole number
- each number is inside the valid range
- no duplicate values exist inside the same list

Returns:

```ts
{
  values: number[]
  errors: string[]
}
```

### `validateTerms(...)`

Checks that no number appears in both minterms and don't-cares.

Invalid example:

```text
Minterms: 1, 3
Don't-cares: 3
```

The term `3` cannot be both a required `1` and an optional don't-care.

## K-Map Logic

### `buildKMap(...)`

Builds a Gray-code K-map layout.

Layouts:

```text
2 variables
Rows: A = 0, 1
Cols: B = 0, 1
```

```text
3 variables
Rows: A = 0, 1
Cols: BC = 00, 01, 11, 10
```

```text
4 variables
Rows: AB = 00, 01, 11, 10
Cols: CD = 00, 01, 11, 10
```

Each cell stores:

- row index
- column index
- minterm index
- binary bits
- value: `0`, `1`, or `X`

The K-map display uses selected SOP implicants to show which cells are covered by each group.

## SOP and POS Logic

### SOP

SOP simplifies the actual minterms.

Input:

```ts
simplifyTerms('sop', variableCount, variableNames, minterms, dontCares)
```

Meaning:

- minterms must be covered
- don't-cares may be used to form larger groups
- zeros must not be covered as required output terms

SOP formatting:

- bit `1` becomes the normal variable
- bit `0` becomes the complemented variable
- bit `-` is omitted

Example:

```text
Pattern: 1-0
Variables: A, B, C
SOP term: AC'
```

### POS

POS is generated by simplifying the zero terms.

The solver derives zeros as:

```ts
zeros = allTerms - minterms - dontCares
```

Then it simplifies those zeros using the same tabulation engine:

```ts
simplifyTerms('pos', variableCount, variableNames, zeros, dontCares)
```

POS formatting:

- bit `0` becomes the normal variable
- bit `1` becomes the complemented variable
- bit `-` is omitted

Example:

```text
Pattern: 1-0
Variables: A, B, C
POS factor: (A' + C)
```

## Quine-McCluskey Tabulation

The tabulation algorithm is implemented by:

```ts
collectPrimeImplicants(...)
```

Process:

1. Combine required target terms with don't-care terms.
2. Convert each term into a binary pattern.
3. Group patterns by number of `1` bits.
4. Compare adjacent groups.
5. Combine patterns that differ in exactly one bit.
6. Replace the differing bit with `-`.
7. Mark combined patterns as used.
8. Carry unused patterns as prime candidates.
9. Repeat until no more combinations are possible.

Example combination:

```text
010
011
---
01-
```

The resulting pattern `01-` covers both original terms.

### `combinePatterns(...)`

Combines two patterns only when:

- they differ in exactly one bit
- neither differing bit is already `-`

If the patterns cannot combine, it returns `null`.

## Prime Implicant Selection

Prime implicants are selected by:

```ts
selectPrimeImplicants(...)
```

Selection rules:

1. Select essential prime implicants first.
   - If a target term is covered by only one prime implicant, that implicant is essential.
2. Mark all terms covered by selected implicants.
3. If terms remain uncovered, greedily choose the implicant that covers the most uncovered terms.
4. Tie breakers:
   - fewer literals first
   - lexicographic pattern order

This gives deterministic results, which is important for predictable UI output.

## Expression Formatting

### Display Formatting

Handled by:

```ts
formatPatternForDisplay(...)
formatExpression(...)
```

Examples:

```text
SOP:
Pattern 0-1 with A, B, C -> A'C
```

```text
POS:
Pattern 0-1 with A, B, C -> (A + C')
```

### Verilog Formatting

Handled by:

```ts
formatVerilogExpression(...)
formatVerilogPattern(...)
```

SOP Verilog uses:

- `~` for NOT
- `&` for AND
- `|` for OR

Example:

```text
S'D0 + SD1
```

becomes:

```verilog
(~S & D0) | (S & D1)
```

Constants are emitted as:

```verilog
1'b0
1'b1
```

## Verilog Module Generation

Handled by:

```ts
generateVerilogModule(moduleName, variableNames, outputs)
```

Example:

```ts
generateVerilogModule('boolean_solver', ['A', 'B'], [
  { name: 'Y', expression: 'B' },
])
```

Output:

```verilog
module boolean_solver(A, B, Y);
  input A, B;
  output Y;

  assign Y = B;
endmodule
```

## Built-In Circuit Examples

### 2:1 Multiplexer

Variables:

```text
S, D0, D1
```

Minterms:

```text
2, 3, 5, 7
```

Simplified SOP:

```text
S'D0 + SD1
```

Verilog:

```verilog
(~S & D0) | (S & D1)
```

### 1-bit Full Adder

Variables:

```text
A, B, Cin
```

Sum minterms:

```text
1, 2, 4, 7
```

Carry minterms:

```text
3, 5, 6, 7
```

Expected simplified carry:

```text
BCin + ACin + AB
```

## Current Scope and Limitations

Supported:

- 2-variable Boolean functions
- 3-variable Boolean functions
- 4-variable Boolean functions
- minterm input
- don't-care input
- SOP simplification
- POS simplification
- K-map display
- Quine-McCluskey tabulation
- Verilog combinational assign statements

Not supported:

- more than 4 variables
- text-based Boolean expression parsing
- sequential circuits
- Verilog simulation
- physical hardware output
- C or assembly helper integration


