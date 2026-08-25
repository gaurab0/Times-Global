"""
Email notification for gate pass issuance.

Sends a copy of the issued gate pass (with device/item details) to the
manager's dedicated inbox. Failures are logged and swallowed: a failed email
must never undo or block a successfully created gate pass.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage

logger = logging.getLogger(__name__)


def build_gatepass_body(gate_pass) -> str:
    """Plain-text summary of a gate pass and its device items."""
    lines = [
        "A new gate pass has been issued.",
        "",
        f"Gate Pass #: {gate_pass.pk}",
        f"Location: {gate_pass.location.name}",
        f"Pass Date: {gate_pass.pass_date.isoformat() if gate_pass.pass_date else 'N/A'}",
        f"Recipient Name: {gate_pass.recipient_name or 'N/A'}",
    ]
    if gate_pass.recipient_address:
        lines.append(f"Recipient Address: {gate_pass.recipient_address}")
    lines.extend([
        f"Prepared By: {gate_pass.prepared_by or 'N/A'}",
        f"Received By: {gate_pass.received_by or 'N/A'}",
        f"Approved By: {gate_pass.approved_by or 'N/A'}",
        f"Issued By: {gate_pass.created_by_name or 'N/A'} <{gate_pass.created_by_email or 'N/A'}>",
        "",
        "Items:",
    ])
    for index, item in enumerate(gate_pass.items.all(), start=1):
        lines.append(
            f"  {index}. S.No: {item.sno or '-'} | {item.itemName} | "
            f"Qty: {item.quantity} | Description: {item.description or '-'} | "
            f"Remarks: {item.remarks or '-'}"
        )
    lines.extend([
        "",
        "This is an automated notification from the Visitor Management System.",
    ])
    return "\n".join(lines)


def send_gatepass_email(gate_pass) -> None:
    """
    Notify GATEPASS_MANAGER_EMAIL about an issued gate pass.

    Never raises: any failure is logged with enough context to debug
    (gate pass id, exception message) without exposing SMTP credentials.
    """
    recipient = getattr(settings, 'GATEPASS_MANAGER_EMAIL', '')
    if not recipient:
        logger.warning(
            "Gate pass email skipped for pass %s: GATEPASS_MANAGER_EMAIL is not configured.",
            gate_pass.pk,
        )
        return

    try:
        email = EmailMessage(
            subject=(
                f"Gate Pass #{gate_pass.pk} issued - "
                f"{gate_pass.location.name} - {gate_pass.pass_date}"
            ),
            body=build_gatepass_body(gate_pass),
            to=[recipient],
        )
        email.send()
        logger.info("Gate pass email sent for pass %s to management inbox.", gate_pass.pk)
    except Exception as exc:
        # Log the failure but never re-raise: issuance must succeed even
        # when SMTP is down. Exception text comes from the SMTP layer and
        # does not include credentials; we deliberately log nothing extra.
        logger.error(
            "Failed to send gate pass email for pass %s: %s",
            gate_pass.pk,
            exc,
        )
