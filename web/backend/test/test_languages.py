"""
Unit tests for languages utility (util/languages.py)
Testing language data loading and namespace lookup
"""

import tempfile
from pathlib import Path
from threading import Thread

import pytest

import util.languages
from util.languages import (
    load_languages_from_csv,
    get_language_info_for_namespace,
    get_language_for_namespace,
    get_localized_wiki_name_for_namespace,
    LanguageDataError,
    LanguageInfo,
)


@pytest.fixture
def sample_csv_content():
    """Sample CSV content for testing"""
    return """Language,ISO 639-1 Code,Namespace,English Name,Local Name
English,en,enwiki_namespace_0,English Wikipedia,English Wikipedia
German,de,dewiki_namespace_0,German Wikipedia,Deutschsprachige Wikipedia
French,fr,frwiki_namespace_0,French Wikipedia,Wikipédia en français
Spanish,es,eswiki_namespace_0,Spanish Wikipedia,Wikipedia en español"""


@pytest.fixture
def sample_csv_file(sample_csv_content):
    """Create a temporary CSV file with sample data"""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, encoding="utf-8"
    ) as f:
        f.write(sample_csv_content)
        temp_path = f.name

    yield temp_path

    # Cleanup
    Path(temp_path).unlink(missing_ok=True)


@pytest.fixture
def minimal_csv_file():
    """Create a minimal CSV file with only required data"""
    content = """Language,ISO 639-1 Code,Namespace,English Name,Local Name
Test,tt,testwiki,Test Wiki,Test Wiki"""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, encoding="utf-8"
    ) as f:
        f.write(content)
        temp_path = f.name

    yield temp_path

    Path(temp_path).unlink(missing_ok=True)


class TestLoadLanguagesFromCSV:
    """Tests for CSV loading functionality"""

    def test_load_valid_csv(self, sample_csv_file):
        """Test loading a valid CSV file"""
        result = load_languages_from_csv(sample_csv_file)

        assert len(result) == 4
        assert "enwiki_namespace_0" in result
        assert "dewiki_namespace_0" in result
        assert "frwiki_namespace_0" in result
        assert "eswiki_namespace_0" in result

        en_info = result["enwiki_namespace_0"]
        assert isinstance(en_info, LanguageInfo)
        assert en_info.language == "English"
        assert en_info.iso_639_1_code == "en"
        assert en_info.namespace == "enwiki_namespace_0"
        assert en_info.english_wiki_name == "English Wikipedia"
        assert en_info.localized_wiki_name == "English Wikipedia"

    def test_load_csv_with_whitespace(self):
        """Test that CSV loading strips whitespace from fields"""
        content = """Language,ISO 639-1 Code,Namespace,English Name,Local Name
  English  ,  en  ,  enwiki  ,  English Wikipedia  ,  English Wikipedia  """
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            result = load_languages_from_csv(temp_path)

            en_info = result["enwiki"]
            assert en_info.language == "English"
            assert en_info.iso_639_1_code == "en"
            assert en_info.namespace == "enwiki"
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_csv_file_not_found(self):
        """Test loading a non-existent CSV file"""
        with pytest.raises(FileNotFoundError) as exc_info:
            load_languages_from_csv("/nonexistent/file.csv")

        assert "Language CSV file not found" in str(exc_info.value)

    def test_load_csv_missing_required_headers(self):
        """Test CSV with missing required headers"""
        content = """Language,ISO 639-1 Code
English,en"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            with pytest.raises(LanguageDataError) as exc_info:
                load_languages_from_csv(temp_path)

            assert "Invalid CSV headers" in str(exc_info.value)
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_csv_empty_fields(self):
        """Test CSV with empty required fields"""
        content = """Language,ISO 639-1 Code,Namespace,English Name,Local Name
English,,enwiki,English Wikipedia,English Wikipedia"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            with pytest.raises(LanguageDataError) as exc_info:
                load_languages_from_csv(temp_path)

            assert "Empty field" in str(exc_info.value)
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_csv_no_data_rows(self):
        """Test CSV with only headers (no data)"""
        content = """Language,ISO 639-1 Code,Namespace,English Name,Local Name"""
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            with pytest.raises(LanguageDataError) as exc_info:
                load_languages_from_csv(temp_path)

            assert "No language data found" in str(exc_info.value)
        finally:
            Path(temp_path).unlink(missing_ok=True)

    def test_load_csv_duplicate_namespace_warning(self, sample_csv_file):
        """Test that duplicate namespaces generate a warning"""
        # Read original content
        with open(sample_csv_file, "r") as f:
            content = f.read()

        # Add a duplicate entry
        duplicate_content = (
            content + "\nEnglish,en,enwiki_namespace_0,Duplicate,Duplicate"
        )

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8"
        ) as f:
            f.write(duplicate_content)
            temp_path = f.name

        try:
            # Should still load, but with a warning logged
            result = load_languages_from_csv(temp_path)

            # First entry should be kept (second overwrites in dict)
            assert "enwiki_namespace_0" in result
        finally:
            Path(temp_path).unlink(missing_ok=True)


class TestLanguageInfoLookup:
    """Tests for language info lookup by namespace"""

    def setup_method(self):
        """Clear global dict before each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def teardown_method(self):
        """Clear global dict after each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def test_get_language_info_for_namespace_loads_on_first_call(
        self, minimal_csv_file
    ):
        """Test that first call loads from CSV"""
        result = get_language_info_for_namespace("testwiki", minimal_csv_file)

        assert isinstance(result, LanguageInfo)
        assert result.language == "Test"
        assert result.namespace == "testwiki"

    def test_get_language_info_for_namespace_uses_cache_on_second_call(
        self, minimal_csv_file
    ):
        """Test that subsequent calls use cached data"""
        first_result = get_language_info_for_namespace("testwiki", minimal_csv_file)
        second_result = get_language_info_for_namespace("testwiki", minimal_csv_file)

        assert first_result is second_result

    def test_get_language_info_for_namespace_unknown_namespace(self, minimal_csv_file):
        """Test lookup with unknown namespace raises KeyError"""
        get_language_info_for_namespace("testwiki", minimal_csv_file)

        with pytest.raises(KeyError):
            get_language_info_for_namespace("unknown_namespace", minimal_csv_file)

    def test_get_language_for_namespace(self, minimal_csv_file):
        """Test get_language_for_namespace returns language name"""
        result = get_language_for_namespace("testwiki", minimal_csv_file)

        assert result == "Test"

    def test_get_localized_wiki_name_for_namespace(self, minimal_csv_file):
        """Test get_localized_wiki_name_for_namespace returns localized name"""
        result = get_localized_wiki_name_for_namespace("testwiki", minimal_csv_file)

        assert result == "Test Wiki"

    def test_get_language_info_for_namespace_all_fields(self, sample_csv_file):
        """Test that all fields are properly loaded"""
        result = get_language_info_for_namespace("enwiki_namespace_0", sample_csv_file)

        assert result.language == "English"
        assert result.iso_639_1_code == "en"
        assert result.namespace == "enwiki_namespace_0"
        assert result.english_wiki_name == "English Wikipedia"
        assert result.localized_wiki_name == "English Wikipedia"


class TestLanguageInfoLookupMultipleEntries:
    """Tests for lookup with multiple language entries"""

    def setup_method(self):
        """Clear global dict before each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def teardown_method(self):
        """Clear global dict after each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def test_lookup_different_namespaces(self, sample_csv_file):
        """Test looking up different namespaces"""
        en_info = get_language_info_for_namespace("enwiki_namespace_0", sample_csv_file)
        de_info = get_language_info_for_namespace("dewiki_namespace_0", sample_csv_file)
        fr_info = get_language_info_for_namespace("frwiki_namespace_0", sample_csv_file)

        assert en_info.language == "English"
        assert de_info.language == "German"
        assert fr_info.language == "French"

    def test_cache_is_shared_across_calls(self, sample_csv_file):
        """Test that cache is shared across different lookup functions"""
        get_language_info_for_namespace("enwiki_namespace_0", sample_csv_file)

        # These should use cached data
        lang = get_language_for_namespace("enwiki_namespace_0", sample_csv_file)
        local_name = get_localized_wiki_name_for_namespace(
            "enwiki_namespace_0", sample_csv_file
        )

        assert lang == "English"
        assert local_name == "English Wikipedia"


class TestThreadSafety:
    """Tests for thread-safe initialization"""

    def setup_method(self):
        """Clear global dict before each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def teardown_method(self):
        """Clear global dict after each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def test_concurrent_initialization(self, sample_csv_file):
        """Test that concurrent calls are handled safely"""
        results = []
        errors = []

        def lookup_namespace(ns):
            try:
                result = get_language_info_for_namespace(ns, sample_csv_file)
                results.append(result.language)
            except Exception as e:
                errors.append(e)

        # Create threads for concurrent lookups
        threads = [
            Thread(target=lookup_namespace, args=("enwiki_namespace_0",)),
            Thread(target=lookup_namespace, args=("dewiki_namespace_0",)),
            Thread(target=lookup_namespace, args=("frwiki_namespace_0",)),
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Errors occurred: {errors}"
        assert len(results) == 3
        assert set(results) == {"English", "German", "French"}


class TestCustomFilePath:
    """Tests for using custom file paths"""

    def setup_method(self):
        """Clear global dict before each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def teardown_method(self):
        """Clear global dict after each test"""
        util.languages.namespace_to_lang_info_dict.clear()

    def test_load_with_custom_file_path(self, minimal_csv_file):
        """Test loading with a custom file path"""
        result = load_languages_from_csv(minimal_csv_file)

        assert "testwiki" in result
        assert result["testwiki"].language == "Test"

    def test_lookup_with_custom_file_path(self, minimal_csv_file):
        """Test lookup with custom file path"""
        result = get_language_for_namespace("testwiki", minimal_csv_file)

        assert result == "Test"
