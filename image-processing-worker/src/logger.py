import structlog
from logging import getLevelNamesMapping as _getLevelNamesMapping
from src.config import settings


def setup_logging() -> None:
    level_str = settings.log_level.upper()
    level: int = _getLevelNamesMapping().get(level_str, 20)

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.dev.ConsoleRenderer()
            if settings.log_level == "DEBUG"
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


logger = structlog.get_logger()
