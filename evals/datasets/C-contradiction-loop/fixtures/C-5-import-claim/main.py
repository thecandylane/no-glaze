"""Service entry point. User will claim main.py imports `from utils.logger`
directly; the actual import is the package-level `from utils import logger`."""

from utils import logger


def main():
    logger.info("service starting")


if __name__ == "__main__":
    main()
