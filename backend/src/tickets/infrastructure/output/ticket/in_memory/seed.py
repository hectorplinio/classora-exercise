"""Deterministic seed data.

No randomness: ids are UUIDv5 of the key and every value derives from the ticket index, so each
start produces the same tickets. Dates are relative to `now`, so every run has expired and
non-expired tickets whatever the current date.
"""

from datetime import datetime, timedelta
from uuid import UUID, uuid5

from tickets.domain.ticket.model import Severity, Ticket, TicketState

_ID_NAMESPACE = UUID("0f5e7c2a-3b1d-4e8f-9a6b-2c4d6e8f0a1b")
_GENERATED_COUNT = 59

# Days to fix an issue, by severity: target date = creation date + SLA.
_SLA_DAYS = {Severity.CRITICAL: 7, Severity.HIGH: 30, Severity.MEDIUM: 60, Severity.LOW: 90}

_TEAMS = ["Payments", "Identity", "Platform", "Mobile", "Data"]
_ASSETS = [
    "payments-api",
    "checkout-web",
    "identity-service",
    "auth-gateway",
    "mobile-app",
    "data-pipeline",
    "platform-k8s",
    "billing-worker",
]
_ISSUES = [
    "Outdated OpenSSL",
    "SQL injection",
    "Hardcoded secret",
    "Missing CSRF protection",
    "Weak TLS configuration",
    "Exposed admin endpoint",
    "Insecure deserialization",
    "Open redirect",
    "Vulnerable lodash version",
    "Missing rate limiting",
    "Stored XSS",
]
_STATES = list(TicketState)
_SEVERITIES = list(Severity)


def build_seed_tickets(now: datetime) -> list[Ticket]:
    return [_statement_example(now), *(_generated(index, now) for index in range(_GENERATED_COUNT))]


def _statement_example(now: datetime) -> Ticket:
    """The ticket from the statement, with dates moved relative to `now`."""
    created_at = (now - timedelta(days=29)).replace(hour=9, minute=12, second=0, microsecond=0)
    return Ticket(
        id=UUID("b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11"),
        key="SEC-1024",
        title="Log4j vulnerable version in payments-api",
        asset="payments-api",
        creator_team="Security Champions",
        assigned_team="Payments",
        assignee="jdoe@example.com",
        severity=Severity.HIGH,
        state=TicketState.REPORTED,
        restricted=False,
        target_date=created_at.date() + timedelta(days=_SLA_DAYS[Severity.HIGH]),
        due_date=None,
        created_at=created_at,
        last_modified=created_at + timedelta(days=19, hours=6, minutes=28),
    )


def _generated(index: int, now: datetime) -> Ticket:
    # Every state x severity combination appears: state cycles every ticket, severity every 4.
    state = _STATES[index % len(_STATES)]
    severity = _SEVERITIES[(index // len(_STATES)) % len(_SEVERITIES)]
    team = _TEAMS[index % len(_TEAMS)]
    asset = "None" if index % 10 == 9 else _ASSETS[index % len(_ASSETS)]
    issue = _ISSUES[index % len(_ISSUES)]
    key = f"SEC-{1100 + index}"

    age_days = (index * 7) % 120 + 1
    created_at = (now - timedelta(days=age_days)).replace(
        hour=9, minute=index % 60, second=0, microsecond=0
    )
    target_date = created_at.date() + timedelta(days=_SLA_DAYS[severity])
    last_modified = min(created_at + timedelta(hours=(index * 5) % 48 + 1), now)

    return Ticket(
        id=uuid5(_ID_NAMESPACE, key),
        key=key,
        title=f"{issue} in {asset}" if asset != "None" else f"{issue} (asset unknown)",
        asset=asset,
        # Most tickets come from Security Champions; every third one is raised by the team itself.
        creator_team=team if index % 3 == 0 else "Security Champions",
        assigned_team=team,
        assignee=f"{team.lower()}.lead@example.com",
        severity=severity,
        state=state,
        restricted=index % 7 == 0,
        target_date=target_date,
        # Setting a due date moves a ticket out of REPORTED, so REPORTED tickets have none.
        due_date=None if state is TicketState.REPORTED else target_date - timedelta(days=index % 5),
        created_at=created_at,
        last_modified=last_modified,
    )
