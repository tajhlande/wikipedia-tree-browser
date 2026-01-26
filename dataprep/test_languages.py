import pytest
from languages import (
    load_languages_from_csv,
    LanguageDataError,
    get_language_for_namespace,
    get_language_info_for_namespace,
    get_localized_wiki_name_for_namespace,
    LanguageInfo
)


class TestLanguageMaps:
    """Test suite for language loading functionality."""

    @pytest.fixture
    def expected_languages(self):
        """Define expected test data for validation."""
        return {
            "Chinese": LanguageInfo(
                language="Chinese",
                iso_639_1_code="zh",
                namespace="zhwiki_namespace_0",
                english_wiki_name="Chinese Wikipedia",
                localized_wiki_name="中文维基百科"
            ),
            "English": LanguageInfo(
                language="English",
                iso_639_1_code="en",
                namespace="enwiki_namespace_0",
                english_wiki_name="English Wikipedia",
                localized_wiki_name="English Wikipedia"
            ),
            "French": LanguageInfo(
                language="French",
                iso_639_1_code="fr",
                namespace="frwiki_namespace_0",
                english_wiki_name="French Wikipedia",
                localized_wiki_name="Wikipédia en français"
            ),
            "Spanish": LanguageInfo(
                language="Spanish",
                iso_639_1_code="es",
                namespace="eswiki_namespace_0",
                english_wiki_name="Spanish Wikipedia",
                localized_wiki_name="Wikipedia en español"
            ),
            "Portuguese": LanguageInfo(
                language="Portuguese",
                iso_639_1_code="pt",
                namespace="ptwiki_namespace_0",
                english_wiki_name="Portuguese Wikipedia",
                localized_wiki_name="Wikipédia em português"
            ),
            "German": LanguageInfo(
                language="German",
                iso_639_1_code="de",
                namespace="dewiki_namespace_0",
                english_wiki_name="German Wikipedia",
                localized_wiki_name="Deutschsprachige Wikipedia"
            ),
            "Italian": LanguageInfo(
                language="Italian",
                iso_639_1_code="it",
                namespace="itwiki_namespace_0",
                english_wiki_name="Italian Wikipedia",
                localized_wiki_name="Wikipedia in italiano"
            ),
            "Russian": LanguageInfo(
                language="Russian",
                iso_639_1_code="ru",
                namespace="ruwiki_namespace_0",
                english_wiki_name="Russian Wikipedia",
                localized_wiki_name="Русская Википедия"
            ),
            "Japanese": LanguageInfo(
                language="Japanese",
                iso_639_1_code="ja",
                namespace="jawiki_namespace_0",
                english_wiki_name="Japanese Wikipedia",
                localized_wiki_name="日本語版ウィキペディア"
            ),
            "Korean": LanguageInfo(
                language="Korean",
                iso_639_1_code="ko",
                namespace="kowiki_namespace_0",
                english_wiki_name="Korean Wikipedia",
                localized_wiki_name="한국어 위키백과"
            ),
            "Vietnamese": LanguageInfo(
                language="Vietnamese",
                iso_639_1_code="vi",
                namespace="viwiki_namespace_0",
                english_wiki_name="Vietnamese Wikipedia",
                localized_wiki_name="Wikipedia tiếng Việt"
            ),
            "Thai": LanguageInfo(
                language="Thai",
                iso_639_1_code="th",
                namespace="thwiki_namespace_0",
                english_wiki_name="Thai Wikipedia",
                localized_wiki_name="วิกิพีเดียภาษาไทย"
            ),
            "Arabic": LanguageInfo(
                language="Arabic",
                iso_639_1_code="ar",
                namespace="arwiki_namespace_0",
                english_wiki_name="Arabic Wikipedia",
                localized_wiki_name="ويكيبيديا العربية"
            ),
            "Egyptian Arabic": LanguageInfo(
                language="Egyptian Arabic",
                iso_639_1_code="arz",
                namespace="arzwiki_namespace_0",
                english_wiki_name="Egyptian Arabic Wikipedia",
                localized_wiki_name="ويكيبيديا المصرية"
            )
        }

    def test_load_languages_success(self, expected_languages):
        """Test successful loading of language data."""
        lang_dict = load_languages_from_csv("languages.csv")

        # Test count
        assert len(lang_dict) == len(expected_languages), \
            f"Expected {len(expected_languages)} languages, got {len(lang_dict)}"

        # Test specific language data - now indexed by namespace
        for lang_name, expected_data in expected_languages.items():
            namespace = expected_data.namespace
            assert namespace in lang_dict, f"Missing namespace: {namespace}"
            assert lang_dict[namespace] == expected_data, \
                f"Data mismatch for {namespace}: expected {expected_data}, got {lang_dict[namespace]}"

    def test_file_not_found_error(self):
        """Test handling of missing CSV file."""
        with pytest.raises(FileNotFoundError):
            load_languages_from_csv("nonexistent_file.csv")

    def test_invalid_csv_format(self, tmp_path):
        """Test handling of invalid CSV format."""
        invalid_csv = tmp_path / "invalid.csv"
        invalid_csv.write_text("Invalid,CSV,Format\nToo,Few,Columns\n")

        with pytest.raises(LanguageDataError):
            load_languages_from_csv(str(invalid_csv))

    def test_missing_headers(self, tmp_path):
        """Test handling of CSV with missing headers."""
        missing_headers_csv = tmp_path / "missing_headers.csv"
        missing_headers_csv.write_text("Chinese,zh,zhwiki_namespace_0\n")

        with pytest.raises(LanguageDataError):
            load_languages_from_csv(str(missing_headers_csv))

    def test_empty_fields(self, tmp_path):
        """Test handling of empty fields in CSV."""
        empty_fields_csv = tmp_path / "empty_fields.csv"
        empty_fields_csv.write_text(
            "Language,ISO 639-1 Code,Namespace\nChinese,zh,\nEnglish,,enwiki_namespace_0\n"
        )

        with pytest.raises(LanguageDataError):
            load_languages_from_csv(str(empty_fields_csv))

    def test_language_lookup(self):
        """Test language lookup by namespace."""
        assert get_language_for_namespace("enwiki_namespace_0", "languages.csv") == "English"
        assert get_language_for_namespace("frwiki_namespace_0", "languages.csv") == "French"
        assert get_language_for_namespace("arzwiki_namespace_0", "languages.csv") == "Egyptian Arabic"
        assert get_language_for_namespace("dewiki_namespace_0", "languages.csv") == "German"

    def test_language_info_lookup(self):
        """Test getting full language info by namespace."""
        english_info = get_language_info_for_namespace("enwiki_namespace_0", "languages.csv")
        assert english_info.language == "English"
        assert english_info.iso_639_1_code == "en"
        assert english_info.namespace == "enwiki_namespace_0"
        assert english_info.english_wiki_name == "English Wikipedia"
        assert english_info.localized_wiki_name == "English Wikipedia"

        french_info = get_language_info_for_namespace("frwiki_namespace_0", "languages.csv")
        assert french_info.language == "French"
        assert french_info.iso_639_1_code == "fr"
        assert french_info.english_wiki_name == "French Wikipedia"
        assert french_info.localized_wiki_name == "Wikipédia en français"

    def test_localized_wiki_name_lookup(self):
        """Test getting localized wiki names by namespace."""
        assert get_localized_wiki_name_for_namespace("enwiki_namespace_0", "languages.csv") == "English Wikipedia"
        assert get_localized_wiki_name_for_namespace("frwiki_namespace_0", "languages.csv") == "Wikipédia en français"
        assert get_localized_wiki_name_for_namespace("arzwiki_namespace_0", "languages.csv") == "ويكيبيديا المصرية"
        assert get_localized_wiki_name_for_namespace("dewiki_namespace_0", "languages.csv") == \
            "Deutschsprachige Wikipedia"

    def test_invalid_namespace_error(self):
        """Test handling of invalid namespace."""
        with pytest.raises(KeyError):
            get_language_for_namespace("invalid_namespace", "languages.csv")