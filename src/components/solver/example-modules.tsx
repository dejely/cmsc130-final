import { Code2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { CIRCUIT_EXAMPLES } from '@/data/circuit-examples'
import { requestVerilogModule } from '@/solver'
import { CodeBlock } from './code-block'
import { SectionTitle } from './section-title'

export function ExampleModules() {
  const [codes, setCodes] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()

    Promise.all(
      CIRCUIT_EXAMPLES.map((example) =>
        requestVerilogModule(
          {
            moduleName: example.moduleName,
            variableCount: example.variableCount,
            variableNames: example.variableNames,
            outputs: example.outputs.map((output) => ({
              name: output.name,
              minterms: output.minterms,
            })),
          },
          controller.signal,
        ).then((response) => [example.id, response.code] as const),
      ),
    )
      .then((entries) => setCodes(Object.fromEntries(entries)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setCodes(
          Object.fromEntries(
            CIRCUIT_EXAMPLES.map((example) => [
              example.id,
              'Unable to load this module from the Python backend.',
            ]),
          ),
        )
      })

    return () => controller.abort()
  }, [])

  return (
    <Card>
      <CardHeader>
        <SectionTitle
          icon={Code2}
          eyebrow="Circuit library"
          title="Built-in Verilog Modules"
        />
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 lg:grid-cols-2">
          {CIRCUIT_EXAMPLES.map((example) => {
            return (
              <div key={example.id} className="grid gap-3 rounded-lg border p-4">
                <div>
                  <h3 className="font-medium text-foreground">
                    {example.title}
                  </h3>
                  <CardDescription>{example.moduleName}</CardDescription>
                </div>
                <CodeBlock
                  code={codes[example.id] ?? 'Loading module from Python backend...'}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
