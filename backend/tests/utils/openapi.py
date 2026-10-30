"""Reduce OpenAPI schemas to what a client relies on, so the contract (OpenAPI 3.0) and the spec
FastAPI generates (OpenAPI 3.1) can be compared.

Kept: type, the formats that change the wire representation, enum, nullability, object
properties and required members, extra-properties policy, array items, and (for parameters only)
default and numeric/length limits. Dropped: documentation (title, description, example), patterns,
and limits a client cannot rely on from FastAPI (e.g. the maxLength the contract adds to a uuid).
"""

from typing import Any

_COMPARED_FORMATS = {"date", "date-time", "uuid", "email"}
_FORMATS_THAT_IMPLY_LENGTH = {"date", "date-time", "uuid"}
_PARAMETER_LIMITS = ("default", "minimum", "maximum", "maxLength", "minItems", "maxItems")

Document = dict[str, Any]


def resolve(node: Any, document: Document) -> Any:
    """Follows a local `$ref` (`#/components/...`)."""
    while isinstance(node, dict) and "$ref" in node:
        target: Any = document
        for part in node["$ref"].removeprefix("#/").split("/"):
            target = target[part]
        node = {**target, **{k: v for k, v in node.items() if k != "$ref"}}
    return node


def _flatten(schema: dict[str, Any], document: Document) -> tuple[dict[str, Any], bool]:
    """Resolves `$ref`, single-element `allOf` (3.0 idiom to document a `$ref`) and
    `anyOf: [X, {type: null}]` (3.1 idiom for nullable). Sibling keys override the target."""
    nullable = bool(schema.get("nullable"))
    schema = resolve(schema, document)
    if "allOf" in schema and len(schema["allOf"]) == 1:
        siblings = {k: v for k, v in schema.items() if k != "allOf"}
        inner, inner_nullable = _flatten(schema["allOf"][0], document)
        return {**inner, **siblings}, nullable or inner_nullable
    if "anyOf" in schema:
        variants = [v for v in schema["anyOf"] if v.get("type") != "null"]
        if len(variants) == 1 and len(variants) < len(schema["anyOf"]):
            siblings = {k: v for k, v in schema.items() if k != "anyOf"}
            inner, _ = _flatten(variants[0], document)
            return {**inner, **siblings}, True
    return schema, nullable or bool(schema.get("nullable"))


def normalize(
    schema: dict[str, Any], document: Document, *, limits: bool = False
) -> dict[str, Any]:
    schema, nullable = _flatten(schema, document)
    result: dict[str, Any] = {"type": schema.get("type"), "nullable": nullable}
    fmt = schema.get("format")
    if fmt in _COMPARED_FORMATS:
        result["format"] = fmt
    if "enum" in schema:
        result["enum"] = sorted(schema["enum"])
    if result["type"] == "object":
        properties = schema.get("properties", {})
        result["properties"] = {
            name: normalize(prop, document, limits=limits) for name, prop in properties.items()
        }
        result["required"] = sorted(schema.get("required", []))
        result["additionalProperties"] = schema.get("additionalProperties", True)
    if result["type"] == "array":
        result["items"] = normalize(schema["items"], document, limits=limits)
    if limits:
        for key in _PARAMETER_LIMITS:
            if key in schema and not (key == "maxLength" and fmt in _FORMATS_THAT_IMPLY_LENGTH):
                result[key] = schema[key]
    return result


def operations(document: Document) -> dict[tuple[str, str], dict[str, Any]]:
    methods = {"get", "put", "post", "patch", "delete"}
    return {
        (path, method): operation
        for path, item in document["paths"].items()
        for method, operation in item.items()
        if method in methods
    }


def parameters(
    operation: dict[str, Any], path_item: dict[str, Any], document: Document
) -> dict[tuple[str, str], dict[str, Any]]:
    """Path-level and operation-level parameters, keyed by (location, name)."""
    result = {}
    for raw in [*path_item.get("parameters", []), *operation.get("parameters", [])]:
        parameter = resolve(raw, document)
        result[(parameter["in"], parameter["name"])] = {
            "required": parameter.get("required", False),
            "schema": normalize(parameter["schema"], document, limits=True),
        }
    return result
