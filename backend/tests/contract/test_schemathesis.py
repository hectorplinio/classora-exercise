"""Property-based check of the running app against the contract.

Schemathesis reads the contract (served at /openapi.json), generates valid and invalid requests
for every operation and validates each response: no 5xx, only documented status codes and media
types, bodies matching the response schemas, invalid input rejected.
"""

from typing import Any

import schemathesis
from hypothesis import settings
from schemathesis.specs.openapi.checks import (
    ignored_auth,
    missing_required_header,
    positive_data_acceptance,
)

from tests.utils.api import SECURITY
from tickets.main import create_app

schema = schemathesis.openapi.from_asgi("/openapi.json", create_app())

# The contract declares a global bearer scheme (statement requirement) that this exercise does not
# validate: the caller is simulated with the X-User-* headers (see the bearerAuth description).
# So the bearer token is not generated (a request "violating the schema" only because it lacks the
# token is not an invalid request here) and the two checks that verify it is enforced are excluded.
schema.config.generation.update(with_security_parameters=False)
_BEARER_NOT_ENFORCED = [ignored_auth, missing_required_header]

# PATCH has business rules a schema cannot express: a schema-valid date before today is a 422 and a
# DONE ticket is a 409, both documented in the contract. So "schema-valid data must be accepted"
# does not hold for it; the check stays on for every other operation.
_BUSINESS_RULES = {("PATCH", "/api/v1/tickets/{id}"): [positive_data_acceptance]}


@schema.parametrize()
@settings(max_examples=50, deadline=None)
def test_api_conforms_to_the_contract(case: schemathesis.Case[Any]) -> None:
    operation = (case.operation.method.upper(), case.operation.path)
    excluded = _BEARER_NOT_ENFORCED + _BUSINESS_RULES.get(operation, [])
    case.call_and_validate(headers=SECURITY, excluded_checks=excluded)
