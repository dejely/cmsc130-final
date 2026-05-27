import { AlertCircle, Binary, RotateCcw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CIRCUIT_EXAMPLES, type CircuitExample, type ExampleOutput } from '@/data/circuit-examples'
import { formatTermSet, type SolveResult, type VariableCount } from '@/solver'
import { SectionTitle } from './section-title'

type InputPanelProps = {
  variableCount: VariableCount
  variableNames: string[]
  mintermInput: string
  dontCareInput: string
  maxTerm: number
  solution: SolveResult | null
  errors: string[]
  isSolving: boolean
  activeExample: string
  onVariableCountChange: (nextValue: string) => void
  onMintermInputChange: (nextValue: string) => void
  onDontCareInputChange: (nextValue: string) => void
  onReset: () => void
  onLoadOutput: (example: CircuitExample, output: ExampleOutput) => void
}

export function InputPanel({
  variableCount,
  variableNames,
  mintermInput,
  dontCareInput,
  maxTerm,
  solution,
  errors,
  isSolving,
  activeExample,
  onVariableCountChange,
  onMintermInputChange,
  onDontCareInputChange,
  onReset,
  onLoadOutput,
}: InputPanelProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <SectionTitle icon={Binary} eyebrow="Input" title="Minterm Entry" />
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="variable-count">Variables</Label>
          <Select
            value={String(variableCount)}
            onValueChange={onVariableCountChange}
          >
            <SelectTrigger id="variable-count">
              <SelectValue placeholder="Variable count" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 variables</SelectItem>
              <SelectItem value="3">3 variables</SelectItem>
              <SelectItem value="4">4 variables</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {variableNames.map((name, index) => (
            <Badge key={`${name}-${index}`} variant="outline">
              {name}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minterms">Minterms</Label>
          <Input
            id="minterms"
            value={mintermInput}
            placeholder={`0-${maxTerm}, separated by commas`}
            onChange={(event) => onMintermInputChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dont-cares">Don't-cares</Label>
          <Input
            id="dont-cares"
            value={dontCareInput}
            placeholder="Optional"
            onChange={(event) => onDontCareInputChange(event.target.value)}
          />
        </div>

        <Alert variant={errors.length > 0 ? 'destructive' : 'default'}>
          <AlertCircle />
          <AlertTitle>
            {errors.length > 0
              ? 'Input needs attention'
              : isSolving
                ? 'Solving with Python'
                : 'Ready to solve'}
          </AlertTitle>
          <AlertDescription>
            {errors.length > 0 ? (
              <ul className="list-disc pl-4">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : isSolving ? (
              <p>Sending the current terms to the Python backend.</p>
            ) : solution ? (
              <p>
                Solving terms {formatTermSet(solution.minterms)} with
                don't-cares {formatTermSet(solution.dontCares)}.
              </p>
            ) : (
              <p>Waiting for the Python backend solver.</p>
            )}
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          {CIRCUIT_EXAMPLES.map((example) => (
            <div
              key={example.id}
              className="grid gap-3 rounded-lg border bg-muted/35 p-3"
            >
              <div>
                <h3 className="font-medium text-foreground">{example.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {example.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {example.outputs.map((output) => (
                  <Button
                    type="button"
                    key={output.name}
                    variant={
                      activeExample === `${example.id}:${output.name}`
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => onLoadOutput(example, output)}
                  >
                    Load {output.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
