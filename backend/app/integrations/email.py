import logging

logger = logging.getLogger("crewww.email")


class ConsoleEmailProvider:
    """Safe local sink; records event type but does not send or log message contents."""

    async def send(self, event: str, recipient: str) -> None:
        masked = recipient[:1] + "***" + recipient[recipient.find("@") :]
        logger.info("local_email_sink event=%s recipient=%s", event, masked)
