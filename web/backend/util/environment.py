"""
Environment configuration management for the web backend application
Loads environment variables from project root and provides typed configuration
"""

import os
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
# __file__ is web/backend/util/environment.py
# Go up 3 levels to reach project root
project_root = Path(__file__).parent.parent.parent
dotenv_path = project_root / ".env"

# Load environment variables
# Use override=False to allow system environment variables to take precedence
load_dotenv(dotenv_path=dotenv_path, override=False)


class CORSConfig:
    """CORS configuration settings"""

    @staticmethod
    def get_origins() -> List[str]:
        """
        Get allowed CORS origins from environment

        Returns:
            List of allowed origins, or ["*"] for wildcard

        Environment:
            CORS_ORIGINS: Comma-separated list of origins
                         Special value "*" enables all origins
                         Empty or unset defaults to localhost for development
        """
        origins_str = os.getenv("CORS_ORIGINS", "").strip()

        # If explicitly set to wildcard
        if origins_str == "*":
            return ["*"]

        # If set to specific origins, parse comma-separated list
        if origins_str:
            origins = [origin.strip() for origin in origins_str.split(",")]
            return [origin for origin in origins if origin]  # Filter empty strings

        # Default to localhost for development
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    @staticmethod
    def allow_credentials() -> bool:
        """
        Whether to allow credentials (cookies, authorization headers)

        Must be False when using wildcard origins
        """
        return os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

    @staticmethod
    def get_methods() -> List[str]:
        """Get allowed HTTP methods"""
        methods_str = os.getenv("CORS_ALLOW_METHODS", "GET,POST,PUT,DELETE,OPTIONS")
        return [m.strip() for m in methods_str.split(",")]

    @staticmethod
    def get_headers() -> List[str] | str:
        """Get allowed headers"""
        headers = os.getenv("CORS_ALLOW_HEADERS", "*")
        if headers == "*":
            return ["*"]
        return [h.strip() for h in headers.split(",")]


class Config:
    """Main application configuration"""

    # CORS settings
    cors = CORSConfig()

    # Data directory (shared with dataprep)
    data_dir = Path(os.getenv("DATA_STORAGE_DIRNAME_VAR", "data"))

    # Logging level
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
