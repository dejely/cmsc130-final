from typing import Literal

from pydantic import BaseModel, Field


class ImplicantModel(BaseModel):
    pattern: str
    terms: list[int]


class ImplicantGroupModel(BaseModel):
    ones: int
    implicants: list[ImplicantModel]


class CombinationStepModel(BaseModel):
    left: str
    right: str
    result: str
    terms: list[int]


class TabulationRoundModel(BaseModel):
    label: str
    groups: list[ImplicantGroupModel]
    combinations: list[CombinationStepModel]
    carriedPrimes: list[ImplicantModel]


class SimplificationResultModel(BaseModel):
    mode: Literal["sop", "pos"]
    targetTerms: list[int]
    dontCares: list[int]
    primeImplicants: list[ImplicantModel]
    selectedImplicants: list[ImplicantModel]
    rounds: list[TabulationRoundModel]
    expression: str
    verilogExpression: str
    constant: Literal["0", "1"] | None


class KMapCellModel(BaseModel):
    row: int
    col: int
    index: int
    bits: str
    value: Literal["0", "1", "X"]


class KMapLayoutModel(BaseModel):
    rowTitle: str
    colTitle: str
    rowLabels: list[str]
    colLabels: list[str]
    cells: list[list[KMapCellModel]]


class TruthTableRowModel(BaseModel):
    index: int
    bits: str
    value: Literal["0", "1", "X"]


class SolveResultModel(BaseModel):
    variableCount: Literal[2, 3, 4]
    variableNames: list[str]
    minterms: list[int]
    dontCares: list[int]
    zeros: list[int]
    truthTable: list[TruthTableRowModel]
    kmap: KMapLayoutModel
    sop: SimplificationResultModel
    pos: SimplificationResultModel


class SolveRequest(BaseModel):
    variableCount: Literal[2, 3, 4]
    variableNames: list[str]
    mintermInput: str = ""
    dontCareInput: str = ""


class SolveResponse(BaseModel):
    result: SolveResultModel | None
    errors: list[str]


class OutputRequest(BaseModel):
    name: str
    expression: str | None = None
    minterms: list[int] | None = None
    dontCares: list[int] = Field(default_factory=list)


class VerilogModuleRequest(BaseModel):
    moduleName: str
    variableCount: Literal[2, 3, 4]
    variableNames: list[str]
    outputs: list[OutputRequest]


class VerilogModuleResponse(BaseModel):
    code: str
