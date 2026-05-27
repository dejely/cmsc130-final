import { useEffect, useState } from 'react'

import { AppHeader } from '@/components/solver/app-header'
import { ExampleModules } from '@/components/solver/example-modules'
import { InputPanel } from '@/components/solver/input-panel'
import { KMapPanel } from '@/components/solver/kmap-panel'
import { SolutionSections } from '@/components/solver/solution-sections'
import type { CircuitExample, ExampleOutput } from '@/data/circuit-examples'
import {
  getDefaultVariableNames,
  getMaxTerm,
  requestSolve,
  requestVerilogModule,
  type SolveResult,
  type VariableCount,
} from '@/solver'

/**
 * Coordinates the Boolean solver workflow:
 * user input -> Python API -> simplified results -> rendered panels.
 */
function App() {
  const [variableCount, setVariableCount] = useState<VariableCount>(2)
  const [variableNames, setVariableNames] = useState<string[]>(
    getDefaultVariableNames(2),
  )
  const [mintermInput, setMintermInput] = useState('1, 3')
  const [dontCareInput, setDontCareInput] = useState('')
  const [activeExample, setActiveExample] = useState('custom')
  const [solution, setSolution] = useState<SolveResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isSolving, setIsSolving] = useState(false)
  const [customVerilog, setCustomVerilog] = useState('')

  const maxTerm = getMaxTerm(variableCount)

  useEffect(() => {
    const controller = new AbortController()

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setIsSolving(true)
      }
    })

    requestSolve(
      {
        variableCount,
        variableNames,
        mintermInput,
        dontCareInput,
      },
      controller.signal,
    )
      .then((response) => {
        setSolution(response.result)
        setErrors(response.errors)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setSolution(null)
        setErrors([
          'The Python backend is not responding. Start it with npm run dev:backend.',
        ])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSolving(false)
        }
      })

    return () => controller.abort()
  }, [dontCareInput, mintermInput, variableCount, variableNames])

  useEffect(() => {
    if (!solution) {
      return
    }

    const controller = new AbortController()

    requestVerilogModule(
      {
        moduleName: 'boolean_solver',
        variableCount,
        variableNames,
        outputs: [{ name: 'Y', expression: solution.sop.verilogExpression }],
      },
      controller.signal,
    )
      .then((response) => setCustomVerilog(response.code))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setCustomVerilog('Unable to generate Verilog module from the backend.')
      })

    return () => controller.abort()
  }, [solution, variableCount, variableNames])

  /** Restores the initial two-variable example and clears any loaded module. */
  const resetSolver = () => {
    setSolution(null)
    setErrors([])
    setCustomVerilog('')
    setIsSolving(true)
    setVariableCount(2)
    setVariableNames(getDefaultVariableNames(2))
    setMintermInput('1, 3')
    setDontCareInput('')
    setActiveExample('custom')
  }

  /**
   * Changing variable count invalidates existing terms because the legal term
   * range and variable names both change.
   */
  const handleVariableCountChange = (nextValue: string) => {
    const nextCount = Number(nextValue) as VariableCount
    setSolution(null)
    setErrors([])
    setCustomVerilog('')
    setIsSolving(true)
    setVariableCount(nextCount)
    setVariableNames(getDefaultVariableNames(nextCount))
    setMintermInput('')
    setDontCareInput('')
    setActiveExample('custom')
  }

  /** Marks the solver as custom as soon as the user edits minterms directly. */
  const handleMintermInputChange = (nextValue: string) => {
    setSolution(null)
    setErrors([])
    setCustomVerilog('')
    setIsSolving(true)
    setMintermInput(nextValue)
    setActiveExample('custom')
  }

  /** Marks the solver as custom as soon as the user edits don't-care terms. */
  const handleDontCareInputChange = (nextValue: string) => {
    setSolution(null)
    setErrors([])
    setCustomVerilog('')
    setIsSolving(true)
    setDontCareInput(nextValue)
    setActiveExample('custom')
  }

  /** Loads one output from an example circuit into the shared solver inputs. */
  const loadOutput = (example: CircuitExample, output: ExampleOutput) => {
    setSolution(null)
    setErrors([])
    setCustomVerilog('')
    setIsSolving(true)
    setVariableCount(example.variableCount)
    setVariableNames(example.variableNames)
    setMintermInput(output.minterms.join(', '))
    setDontCareInput('')
    setActiveExample(`${example.id}:${output.name}`)
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <AppHeader />

      <section className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <InputPanel
          variableCount={variableCount}
          variableNames={variableNames}
          mintermInput={mintermInput}
          dontCareInput={dontCareInput}
          maxTerm={maxTerm}
          solution={solution}
          errors={errors}
          isSolving={isSolving}
          activeExample={activeExample}
          onVariableCountChange={handleVariableCountChange}
          onMintermInputChange={handleMintermInputChange}
          onDontCareInputChange={handleDontCareInputChange}
          onReset={resetSolver}
          onLoadOutput={loadOutput}
        />
        <KMapPanel maxTerm={maxTerm} solution={solution} isSolving={isSolving} />
      </section>

      {solution ? (
        <SolutionSections
          solution={solution}
          variableNames={variableNames}
          customVerilog={customVerilog}
        />
      ) : null}

      <ExampleModules />
    </main>
  )
}

export default App
