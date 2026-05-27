import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    SolveRequest,
    SolveResponse,
    VerilogModuleRequest,
    VerilogModuleResponse,
)

from .solver import (
    generate_verilog_module,
    get_max_term,
    parse_term_list,
    solve_boolean_function,
    validate_terms,
)


app = FastAPI(title="Boolean Solver API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_origin_regex=os.getenv("FRONTEND_ORIGIN_REGEX", r"^https://.*\.vercel\.app$"),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.head("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "Boolean Solver API"}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/solve", response_model=SolveResponse)
def solve(request: SolveRequest) -> SolveResponse:
    errors = validate_variable_names(request.variableCount, request.variableNames)
    max_term = get_max_term(request.variableCount)
    parsed_minterms = parse_term_list(request.mintermInput, "Minterms", max_term)
    parsed_dont_cares = parse_term_list(
        request.dontCareInput, "Don't-cares", max_term
    )

    errors.extend(parsed_minterms["errors"])
    errors.extend(parsed_dont_cares["errors"])
    errors.extend(validate_terms(parsed_minterms["values"], parsed_dont_cares["values"]))

    if errors:
        return SolveResponse(result=None, errors=errors)

    result = solve_boolean_function(
        request.variableCount,
        request.variableNames,
        parsed_minterms["values"],
        parsed_dont_cares["values"],
    )
    return SolveResponse(result=result, errors=[])


@app.post("/api/verilog-module", response_model=VerilogModuleResponse)
def verilog_module(request: VerilogModuleRequest) -> VerilogModuleResponse:
    errors = validate_variable_names(request.variableCount, request.variableNames)
    outputs: list[dict] = []

    for output in request.outputs:
        expression = output.expression

        if expression is None:
            minterms = sorted(output.minterms or [])
            dont_cares = sorted(output.dontCares)
            result = solve_boolean_function(
                request.variableCount,
                request.variableNames,
                minterms,
                dont_cares,
            )
            expression = result["sop"]["verilogExpression"]

        outputs.append({"name": output.name, "expression": expression})

    if errors:
        return VerilogModuleResponse(code="\n".join(errors))

    return VerilogModuleResponse(
        code=generate_verilog_module(request.moduleName, request.variableNames, outputs)
    )


def validate_variable_names(variable_count: int, variable_names: list[str]) -> list[str]:
    if len(variable_names) == variable_count:
        return []

    return [
        f"Expected {variable_count} variable names, but received {len(variable_names)}."
    ]
