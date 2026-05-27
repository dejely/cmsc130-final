from __future__ import annotations

import re

DEFAULT_VARIABLE_NAMES = ["A", "B", "C", "D"]
GRAY_BY_WIDTH = {
    1: ["0", "1"],
    2: ["00", "01", "11", "10"],
}


def get_default_variable_names(count: int) -> list[str]:
    return DEFAULT_VARIABLE_NAMES[:count]


def get_max_term(variable_count: int) -> int:
    return (2**variable_count) - 1


def parse_term_list(input_text: str, label: str, max_term: int) -> dict:
    text = input_text.strip()

    if not text:
        return {"values": [], "errors": []}

    values: list[int] = []
    errors: list[str] = []
    seen: set[int] = set()
    tokens = [token for token in re.split(r"[,\s]+", text) if token]

    # Check each token first so bad input can return a friendly message.
    for token in tokens:
        if not re.fullmatch(r"\d+", token):
            errors.append(f'{label} contains "{token}", which is not a whole number.')
            continue

        value = int(token)

        if value < 0 or value > max_term:
            errors.append(f"{label} value {value} is outside 0-{max_term}.")
            continue

        if value in seen:
            errors.append(f"{label} value {value} is repeated.")
            continue

        seen.add(value)
        values.append(value)

    return {"values": sorted(values), "errors": errors}

# Check if there is any overlapping, we use set here
def validate_terms(minterms: list[int], dont_cares: list[int]) -> list[str]:
    dont_care_set = set(dont_cares)
    overlap = [term for term in minterms if term in dont_care_set] # check each if included also in dont care set

    if not overlap:
        return []

    joined = ", ".join(str(term) for term in overlap)
    return [
        f"Minterms and don't-cares overlap at {joined}. Keep each term in only one list."
    ]


def solve_boolean_function(
    variable_count: int,
    variable_names: list[str],
    minterms: list[int],
    dont_cares: list[int],
) -> dict:
    universe = get_universe(variable_count)
    minterm_set = set(minterms)
    dont_care_set = set(dont_cares)
    zeros = [
        term for term in universe if term not in minterm_set and term not in dont_care_set
    ]


    # loop through every possible combination
    truth_table = []
    for index in universe:
        if index in minterm_set:
            value = "1"
        elif index in dont_care_set:
            value = "X"
        else:
            value = "0" 
        # save its index, binary form, and value into the truth table.
        truth_table.append(
            {
                "index": index,
                "bits": to_bits(index, variable_count),
                "value": value,
            }
        )

    return {
        "variableCount": variable_count,
        "variableNames": variable_names,
        "minterms": minterms,
        "dontCares": dont_cares,
        "zeros": zeros,
        "truthTable": truth_table,
        "kmap": build_kmap(variable_count, minterms, dont_cares),
        "sop": simplify_terms(
            "sop", variable_count, variable_names, minterms, dont_cares
        ),
        "pos": simplify_terms("pos", variable_count, variable_names, zeros, dont_cares),
    }


def generate_verilog_module(
    module_name: str,
    variable_names: list[str],
    outputs: list[dict],
) -> str:
    ports = [*variable_names, *[output["name"] for output in outputs]]
    declarations = [
        f"module {module_name}({', '.join(ports)});",
        f"  input {', '.join(variable_names)};",
        f"  output {', '.join(output['name'] for output in outputs)};",
        "",
    ]

    # The frontend sends one expression per output, then Python formats the module.
    for output in outputs:
        declarations.append(f"  assign {output['name']} = {output['expression']};")

    declarations.append("endmodule")
    return "\n".join(declarations)


def format_pattern_for_display(
    pattern: str,
    variable_names: list[str],
    mode: str,
) -> str:
    if all(bit == "-" for bit in pattern):
        return "1" if mode == "sop" else "0"

    parts: list[str] = []
    for index, bit in enumerate(pattern):
        if bit == "-":
            continue

        variable = variable_names[index]
        if mode == "sop":
            parts.append(variable if bit == "1" else f"{variable}'")
        else:
            parts.append(variable if bit == "0" else f"{variable}'")

    return "".join(parts) if mode == "sop" else f"({' + '.join(parts)})"


def implicant_covers_index(pattern: str, index: int) -> bool:
    bits = to_bits(index, len(pattern))
    return all(bit == "-" or bit == bits[bit_index] for bit_index, bit in enumerate(pattern))


def simplify_terms(
    mode: str,
    variable_count: int,
    variable_names: list[str],
    target_terms: list[int],
    dont_cares: list[int],
) -> dict:
    unique_targets = unique_sorted(target_terms)
    unique_dont_cares = unique_sorted(dont_cares)

    if not unique_targets:
        constant = "0" if mode == "sop" else "1"
        return {
            "mode": mode,
            "targetTerms": unique_targets,
            "dontCares": unique_dont_cares,
            "primeImplicants": [],
            "selectedImplicants": [],
            "rounds": [],
            "expression": constant,
            "verilogExpression": f"1'b{constant}",
            "constant": constant,
        }

    prime_data = collect_prime_implicants(
        variable_count, unique_targets, unique_dont_cares
    )
    prime_implicants = prime_data["primeImplicants"]
    rounds = prime_data["rounds"]
    selected_implicants = select_prime_implicants(prime_implicants, unique_targets)
    expression = format_expression(selected_implicants, variable_names, mode)
    verilog_expression = format_verilog_expression(
        selected_implicants, variable_names, mode
    )

    return {
        "mode": mode,
        "targetTerms": unique_targets,
        "dontCares": unique_dont_cares,
        "primeImplicants": prime_implicants,
        "selectedImplicants": selected_implicants,
        "rounds": rounds,
        "expression": expression,
        "verilogExpression": verilog_expression,
        "constant": expression if expression in ["0", "1"] else None,
    }


def collect_prime_implicants(
    variable_count: int,
    target_terms: list[int],
    dont_cares: list[int],
) -> dict:
    all_terms = unique_sorted([*target_terms, *dont_cares])
    current = [{"pattern": to_bits(term, variable_count), "terms": [term]} for term in all_terms]
    rounds: list[dict] = []
    prime_map: dict[str, dict] = {}
    round_index = 0

    while current:
        groups = group_implicants(current)
        used_patterns: set[str] = set()
        next_map: dict[str, dict] = {}
        combinations: list[dict] = []

        # Only groups with neighboring one-counts can be merged in this method.
        for index in range(len(groups) - 1):
            left_group = groups[index]
            right_group = groups[index + 1]

            if right_group["ones"] != left_group["ones"] + 1:
                continue

            for left in left_group["implicants"]:
                for right in right_group["implicants"]:
                    combined_pattern = combine_patterns(left["pattern"], right["pattern"])

                    if combined_pattern is None:
                        continue

                    used_patterns.add(left["pattern"])
                    used_patterns.add(right["pattern"])

                    terms = unique_sorted([*left["terms"], *right["terms"]])
                    existing = next_map.get(combined_pattern)
                    next_map[combined_pattern] = {
                        "pattern": combined_pattern,
                        "terms": unique_sorted([*existing["terms"], *terms])
                        if existing
                        else terms,
                    }
                    combinations.append(
                        {
                            "left": left["pattern"],
                            "right": right["pattern"],
                            "result": combined_pattern,
                            "terms": terms,
                        }
                    )

        carried_primes = [
            implicant
            for implicant in current
            if implicant["pattern"] not in used_patterns
        ]

        # Don't-cares help make bigger groups, but they should not force coverage.
        for implicant in carried_primes:
            if covers_any_target(implicant["pattern"], target_terms):
                prime_map[implicant["pattern"]] = implicant

        rounds.append(
            {
                "label": "Initial groups" if round_index == 0 else f"Round {round_index}",
                "groups": groups,
                "combinations": dedupe_combinations(combinations),
                "carriedPrimes": carried_primes,
            }
        )

        if not next_map:
            break

        current = sort_implicants(list(next_map.values()))
        round_index += 1

    return {
        "primeImplicants": sort_implicants(list(prime_map.values())),
        "rounds": rounds,
    }


def select_prime_implicants(
    prime_implicants: list[dict],
    target_terms: list[int],
) -> list[dict]:
    selected: dict[str, dict] = {}
    covered: set[int] = set()

    # Essential implicants are picked first because no other group covers that term.
    for term in target_terms:
        covering = [
            implicant
            for implicant in prime_implicants
            if implicant_covers_index(implicant["pattern"], term)
        ]

        if len(covering) == 1:
            selected[covering[0]["pattern"]] = covering[0]

    for implicant in selected.values():
        for term in target_terms:
            if implicant_covers_index(implicant["pattern"], term):
                covered.add(term)

    while len(covered) < len(target_terms):
        candidates = []
        for implicant in prime_implicants:
            if implicant["pattern"] in selected:
                continue

            newly_covered = [
                term
                for term in target_terms
                if term not in covered and implicant_covers_index(implicant["pattern"], term)
            ]

            if newly_covered:
                candidates.append(
                    {
                        "implicant": implicant,
                        "newlyCovered": newly_covered,
                    }
                )

        candidates.sort(
            key=lambda candidate: (
                -len(candidate["newlyCovered"]),
                literal_count(candidate["implicant"]["pattern"]),
                candidate["implicant"]["pattern"],
            )
        )
        best = candidates[0] if candidates else None

        if best is None:
            break

        selected[best["implicant"]["pattern"]] = best["implicant"]
        for term in best["newlyCovered"]:
            covered.add(term)

    return sort_implicants(list(selected.values()))


def build_kmap(
    variable_count: int,
    minterms: list[int],
    dont_cares: list[int],
) -> dict:
    row_bit_count = 2 if variable_count == 4 else 1
    col_bit_count = variable_count - row_bit_count
    row_labels = GRAY_BY_WIDTH[row_bit_count]
    col_labels = GRAY_BY_WIDTH[col_bit_count]
    minterm_set = set(minterms)
    dont_care_set = set(dont_cares)
    cells = []

    # Gray-code labels keep neighboring K-map cells one bit apart.
    for row, row_label in enumerate(row_labels):
        row_cells = []
        for col, col_label in enumerate(col_labels):
            bits = f"{row_label}{col_label}"
            index = int(bits, 2)
            value = "1" if index in minterm_set else "X" if index in dont_care_set else "0"
            row_cells.append(
                {
                    "row": row,
                    "col": col,
                    "index": index,
                    "bits": bits,
                    "value": value,
                }
            )
        cells.append(row_cells)

    return {
        "rowTitle": "AB" if variable_count == 4 else "A",
        "colTitle": "B" if variable_count == 2 else "BC" if variable_count == 3 else "CD",
        "rowLabels": row_labels,
        "colLabels": col_labels,
        "cells": cells,
    }


def format_expression(
    implicants: list[dict],
    variable_names: list[str],
    mode: str,
) -> str:
    if not implicants:
        return "0" if mode == "sop" else "1"

    if any(is_all_dont_care(implicant["pattern"]) for implicant in implicants):
        return "1" if mode == "sop" else "0"

    terms = [
        format_pattern_for_display(implicant["pattern"], variable_names, mode)
        for implicant in implicants
    ]
    return " + ".join(terms) if mode == "sop" else "".join(terms)


def format_verilog_expression(
    implicants: list[dict],
    variable_names: list[str],
    mode: str,
) -> str:
    if not implicants:
        return "1'b0" if mode == "sop" else "1'b1"

    if any(is_all_dont_care(implicant["pattern"]) for implicant in implicants):
        return "1'b1" if mode == "sop" else "1'b0"

    terms = [
        format_verilog_pattern(implicant["pattern"], variable_names, mode)
        for implicant in implicants
    ]
    return " | ".join(terms) if mode == "sop" else " & ".join(terms)


def format_verilog_pattern(
    pattern: str,
    variable_names: list[str],
    mode: str,
) -> str:
    literals: list[str] = []
    for index, bit in enumerate(pattern):
        if bit == "-":
            continue

        variable = variable_names[index]
        if mode == "sop":
            literals.append(variable if bit == "1" else f"~{variable}")
        else:
            literals.append(variable if bit == "0" else f"~{variable}")

    if len(literals) == 1:
        return literals[0]

    joiner = " & " if mode == "sop" else " | "
    return f"({joiner.join(literals)})"


def group_implicants(implicants: list[dict]) -> list[dict]:
    group_map: dict[int, list[dict]] = {}

    for implicant in implicants:
        ones = count_ones(implicant["pattern"])
        group_map.setdefault(ones, []).append(implicant)

    return [
        {
            "ones": ones,
            "implicants": sort_implicants(group_implicants),
        }
        for ones, group_implicants in sorted(group_map.items())
    ]


def combine_patterns(left: str, right: str) -> str | None:
    differences = 0
    combined = ""

    for left_bit, right_bit in zip(left, right):
        if left_bit == right_bit:
            combined += left_bit
            continue

        if left_bit == "-" or right_bit == "-":
            return None

        differences += 1
        combined += "-"

    return combined if differences == 1 else None


def covers_any_target(pattern: str, target_terms: list[int]) -> bool:
    return any(implicant_covers_index(pattern, term) for term in target_terms)


def dedupe_combinations(combinations: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}

    for combination in combinations:
        key = f"{combination['left']}:{combination['right']}:{combination['result']}"
        by_key[key] = combination

    return sorted(
        by_key.values(),
        key=lambda item: f"{item['result']}:{item['left']}:{item['right']}",
    )


def sort_implicants(implicants: list[dict]) -> list[dict]:
    return sorted(
        implicants,
        key=lambda implicant: (
            implicant["terms"][0] if implicant["terms"] else 0,
            implicant["pattern"],
        ),
    )


def get_universe(variable_count: int) -> list[int]:
    return list(range(2**variable_count))


def unique_sorted(values: list[int]) -> list[int]:
    return sorted(set(values))


def to_bits(value: int, width: int) -> str:
    return format(value, "b").zfill(width)


def count_ones(pattern: str) -> int:
    return len([bit for bit in pattern if bit == "1"])


def literal_count(pattern: str) -> int:
    return len([bit for bit in pattern if bit != "-"])


def is_all_dont_care(pattern: str) -> bool:
    return all(bit == "-" for bit in pattern)
