import { Map } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { implicantCoversIndex, type SolveResult } from '@/solver'
import { EmptyState } from './empty-state'
import { SectionTitle } from './section-title'

type KMapPanelProps = {
  maxTerm: number
  solution: SolveResult | null
  isSolving: boolean
}

export function KMapPanel({ maxTerm, solution, isSolving }: KMapPanelProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <SectionTitle icon={Map} eyebrow="K-map" title="Gray-Code Layout" />
        <Badge variant="outline">m0-m{maxTerm}</Badge>
      </CardHeader>
      <CardContent>
        {solution ? (
          <KMapView solution={solution} />
        ) : (
          <EmptyState
            message={
              isSolving
                ? 'Solving with the Python backend.'
                : 'Fix the input errors to render the map.'
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

function KMapView({ solution }: { solution: SolveResult }) {
  const groups = solution.sop.selectedImplicants

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-24 text-center text-foreground">
            {solution.kmap.rowTitle}\{solution.kmap.colTitle}
          </TableHead>
          {solution.kmap.colLabels.map((label) => (
            <TableHead key={label} className="text-center text-foreground">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {solution.kmap.cells.map((row, rowIndex) => (
          <TableRow
            key={solution.kmap.rowLabels[rowIndex]}
            className="hover:bg-transparent"
          >
            <TableHead className="text-center text-foreground">
              {solution.kmap.rowLabels[rowIndex]}
            </TableHead>
            {row.map((cell) => {
              const coveredBy = groups
                .map((group, index) =>
                  implicantCoversIndex(group.pattern, cell.index)
                    ? index + 1
                    : null,
                )
                .filter((group): group is number => group !== null)

              return (
                <TableCell
                  key={cell.index}
                  className={cn(
                    'h-28 min-w-24 whitespace-normal border-l text-center align-top',
                    cell.value === '1' && 'bg-emerald-50',
                    cell.value === 'X' && 'bg-amber-50',
                  )}
                >
                  <span className="block text-3xl font-bold leading-none text-foreground">
                    {cell.value}
                  </span>
                  <span className="mt-2 block font-mono text-xs text-muted-foreground">
                    m{cell.index}
                  </span>
                  {coveredBy.length > 0 ? (
                    <span className="mt-3 flex flex-wrap justify-center gap-1">
                      {coveredBy.map((group) => (
                        <Badge key={group} className="font-mono text-[10px]">
                          G{group}
                        </Badge>
                      ))}
                    </span>
                  ) : null}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
