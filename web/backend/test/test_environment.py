"""
Tests for environment configuration module
"""

import pytest
import os
from util.environment import CORSConfig, Config


@pytest.fixture(autouse=True)
def reset_env():
    """Reset environment variables before each test"""
    # Save original values
    original_origins = os.environ.get("CORS_ORIGINS")
    original_credentials = os.environ.get("CORS_ALLOW_CREDENTIALS")
    original_methods = os.environ.get("CORS_ALLOW_METHODS")
    original_headers = os.environ.get("CORS_ALLOW_HEADERS")

    yield

    # Restore original values
    if original_origins is not None:
        os.environ["CORS_ORIGINS"] = original_origins
    elif "CORS_ORIGINS" in os.environ:
        del os.environ["CORS_ORIGINS"]

    if original_credentials is not None:
        os.environ["CORS_ALLOW_CREDENTIALS"] = original_credentials
    elif "CORS_ALLOW_CREDENTIALS" in os.environ:
        del os.environ["CORS_ALLOW_CREDENTIALS"]

    if original_methods is not None:
        os.environ["CORS_ALLOW_METHODS"] = original_methods
    elif "CORS_ALLOW_METHODS" in os.environ:
        del os.environ["CORS_ALLOW_METHODS"]

    if original_headers is not None:
        os.environ["CORS_ALLOW_HEADERS"] = original_headers
    elif "CORS_ALLOW_HEADERS" in os.environ:
        del os.environ["CORS_ALLOW_HEADERS"]


def test_cors_default_origins():
    """Test default localhost origins when CORS_ORIGINS is not set"""
    if "CORS_ORIGINS" in os.environ:
        del os.environ["CORS_ORIGINS"]

    origins = CORSConfig.get_origins()
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins
    assert len(origins) == 2


def test_cors_wildcard():
    """Test wildcard origin"""
    os.environ["CORS_ORIGINS"] = "*"
    origins = CORSConfig.get_origins()
    assert origins == ["*"]


def test_cors_custom_origins():
    """Test custom origins"""
    os.environ["CORS_ORIGINS"] = "https://app.example.com,https://www.example.com"
    origins = CORSConfig.get_origins()
    assert "https://app.example.com" in origins
    assert "https://www.example.com" in origins
    assert len(origins) == 2


def test_cors_origins_with_whitespace():
    """Test origins with whitespace are trimmed"""
    os.environ["CORS_ORIGINS"] = "https://app.example.com , https://www.example.com "
    origins = CORSConfig.get_origins()
    assert "https://app.example.com" in origins
    assert "https://www.example.com" in origins
    assert len(origins) == 2


def test_cors_origins_empty_string():
    """Test empty string defaults to localhost"""
    os.environ["CORS_ORIGINS"] = ""
    origins = CORSConfig.get_origins()
    assert "http://localhost:3000" in origins
    assert "http://127.0.0.1:3000" in origins


def test_cors_credentials_default():
    """Test default credentials setting"""
    if "CORS_ALLOW_CREDENTIALS" in os.environ:
        del os.environ["CORS_ALLOW_CREDENTIALS"]

    credentials = CORSConfig.allow_credentials()
    assert credentials is False


def test_cors_credentials_true():
    """Test credentials set to true"""
    os.environ["CORS_ALLOW_CREDENTIALS"] = "true"
    credentials = CORSConfig.allow_credentials()
    assert credentials is True


def test_cors_credentials_false():
    """Test credentials set to false"""
    os.environ["CORS_ALLOW_CREDENTIALS"] = "false"
    credentials = CORSConfig.allow_credentials()
    assert credentials is False


def test_cors_credentials_case_insensitive():
    """Test credentials setting is case insensitive"""
    os.environ["CORS_ALLOW_CREDENTIALS"] = "TRUE"
    credentials = CORSConfig.allow_credentials()
    assert credentials is True

    os.environ["CORS_ALLOW_CREDENTIALS"] = "False"
    credentials = CORSConfig.allow_credentials()
    assert credentials is False


def test_cors_methods_default():
    """Test default methods"""
    if "CORS_ALLOW_METHODS" in os.environ:
        del os.environ["CORS_ALLOW_METHODS"]

    methods = CORSConfig.get_methods()
    assert "GET" in methods
    assert "POST" in methods
    assert "PUT" in methods
    assert "DELETE" in methods
    assert "OPTIONS" in methods


def test_cors_methods_custom():
    """Test custom methods"""
    os.environ["CORS_ALLOW_METHODS"] = "GET,POST"
    methods = CORSConfig.get_methods()
    assert "GET" in methods
    assert "POST" in methods
    assert len(methods) == 2


def test_cors_headers_default():
    """Test default headers"""
    if "CORS_ALLOW_HEADERS" in os.environ:
        del os.environ["CORS_ALLOW_HEADERS"]

    headers = CORSConfig.get_headers()
    assert headers == ["*"]


def test_cors_headers_custom():
    """Test custom headers"""
    os.environ["CORS_ALLOW_HEADERS"] = "Content-Type,Authorization"
    headers = CORSConfig.get_headers()
    assert "Content-Type" in headers
    assert "Authorization" in headers
    assert len(headers) == 2


def test_config_class():
    """Test Config class has CORS config"""
    assert hasattr(Config, "cors")
    assert isinstance(Config.cors, CORSConfig)
