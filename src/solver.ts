/** Shared frontend types and small helpers for the Python-backed solver API. */

export type VariableCount = 2 | 3 | 4

export type CellValue = '0' | '1' | 'X'

export type ExpressionMode = 'sop' | 'pos'

export interface Implicant {
  pattern: string
  terms: number[]
}

export interface ImplicantGroup {
  ones: number
  implicants: Implicant[]
}

export interface CombinationStep {
  left: string
  right: string
  result: string
  terms: number[]
}

export interface TabulationRound {
  label: string
  groups: ImplicantGroup[]
  combinations: CombinationStep[]
  carriedPrimes: Implicant[]
}

export interface SimplificationResult {
  mode: ExpressionMode
  targetTerms: number[]
  dontCares: number[]
  primeImplicants: Implicant[]
  selectedImplicants: Implicant[]
  rounds: TabulationRound[]
  expression: string
  verilogExpression: string
  constant: '0' | '1' | null
}

export interface KMapCell {
  row: number
  col: number
  index: number
  bits: string
  value: CellValue
}

export interface KMapLayout {
  rowTitle: string
  colTitle: string
  rowLabels: string[]
  colLabels: string[]
  cells: KMapCell[][]
}

export interface SolveResult {
  variableCount: VariableCount
  variableNames: string[]
  minterms: number[]
  dontCares: number[]
  zeros: number[]
  truthTable: Array<{
    index: number
    bits: string
    value: CellValue
  }>
  kmap: KMapLayout
  sop: SimplificationResult
  pos: SimplificationResult
}

export interface SolveRequest {
  variableCount: VariableCount
  variableNames: string[]
  mintermInput: string
  dontCareInput: string
}

export interface SolveResponse {
  result: SolveResult | null
  errors: string[]
}

export interface VerilogOutputRequest {
  name: string
  expression?: string
  minterms?: number[]
  dontCares?: number[]
}

export interface VerilogModuleRequest {
  moduleName: string
  variableCount: VariableCount
  variableNames: string[]
  outputs: VerilogOutputRequest[]
}

export interface VerilogModuleResponse {
  code: string
}

const DEFAULT_VARIABLE_NAMES = ['A', 'B', 'C', 'D']

/** Returns the conventional variable names for the requested variable count. */
export const getDefaultVariableNames = (count: VariableCount) =>
  DEFAULT_VARIABLE_NAMES.slice(0, count)

/** Returns the largest legal minterm index for a given variable count. */
export const getMaxTerm = (variableCount: VariableCount) =>
  2 ** variableCount - 1

/** Calls the Python backend for parsing, validation, and simplification. */
export const requestSolve = (
  body: SolveRequest,
  signal?: AbortSignal,
) => postJson<SolveResponse>('/api/solve', body, signal)

/** Calls the Python backend to format a complete Verilog module. */
export const requestVerilogModule = (
  body: VerilogModuleRequest,
  signal?: AbortSignal,
) => postJson<VerilogModuleResponse>('/api/verilog-module', body, signal)

/** Formats term arrays for compact UI labels. */
export function formatTermSet(terms: number[]) {
  return terms.length > 0 ? terms.join(', ') : 'none'
}

/** Converts an implicant pattern into algebraic notation for display badges. */
export function formatPatternForDisplay(
  pattern: string,
  variableNames: string[],
  mode: ExpressionMode,
) {
  if (pattern.split('').every((bit) => bit === '-')) {
    return mode === 'sop' ? '1' : '0'
  }

  const parts = pattern
    .split('')
    .map((bit, index) => {
      if (bit === '-') {
        return null
      }

      const variable = variableNames[index]

      if (mode === 'sop') {
        return bit === '1' ? variable : `${variable}'`
      }

      return bit === '0' ? variable : `${variable}'`
    })
    .filter((part): part is string => part !== null)

  return mode === 'sop' ? parts.join('') : `(${parts.join(' + ')})`
}

/** Checks whether a concrete term index matches a possibly merged pattern. */
export function implicantCoversIndex(pattern: string, index: number) {
  const bits = index.toString(2).padStart(pattern.length, '0')

  return pattern
    .split('')
    .every((bit, bitIndex) => bit === '-' || bit === bits[bitIndex])
}

async function postJson<TResponse>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}.`)
  }

  return response.json() as Promise<TResponse>
}
