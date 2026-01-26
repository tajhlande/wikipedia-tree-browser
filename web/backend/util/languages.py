import csv
import logging
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Dict

logger = logging.getLogger(__name__)


# types to simplify this code
@dataclass
class LanguageInfo:
    language: str
    iso_639_1_code: str
    namespace: str
    english_wiki_name: str
    localized_wiki_name: str


LanguageInfoDict = Dict[str, LanguageInfo]

# header keys
_LANGUAGE = "Language"
_ISO_639_1_CODE = "ISO 639-1 Code"
_NAMESPACE = "Namespace"
_ENGLISH_NAME = "English Name"
_LOCAL_NAME = "Local Name"

DEFAULT_LANGUAGE_FILE_PATH = "../../dataprep/languages.csv"


class LanguageDataError(Exception):
    """Custom exception for language data validation errors."""
    pass


def load_languages_from_csv(filepath: str = DEFAULT_LANGUAGE_FILE_PATH) -> LanguageInfoDict:
    """
    Load language code, name, and namespace data from a CSV file.

    Args:
        filepath: Path to the CSV file containing language data

    Returns:
        LanguageInfoDict mapping namespaces to LanguageInfo instances

    Raises:
        FileNotFoundError: If the CSV file doesn't exist
        LanguageDataError: If the CSV file has invalid format or data
    """
    csv_path = Path(filepath)

    if not csv_path.exists():
        raise FileNotFoundError(f"Language CSV file not found: {filepath}")

    lang_dict: LanguageInfoDict = {}

    try:
        with open(csv_path, encoding="utf-8") as csvfile:
            # Use csv.DictReader for better maintainability and error handling
            reader = csv.DictReader(csvfile)

            # Validate headers
            expected_headers = {_LANGUAGE, _ISO_639_1_CODE, _NAMESPACE, _ENGLISH_NAME, _LOCAL_NAME, }
            if not expected_headers.issubset(reader.fieldnames or set()):
                raise LanguageDataError(
                    f"Invalid CSV headers. Expected: {expected_headers}, "
                    f"Got: {set(reader.fieldnames or [])}"
                )

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    language = row[_LANGUAGE].strip()
                    iso_code = row[_ISO_639_1_CODE].strip()
                    namespace = row[_NAMESPACE].strip()
                    english_name = row[_ENGLISH_NAME].strip()
                    localized_name = row[_LOCAL_NAME].strip()

                    # Validate data
                    if not all([language, iso_code, namespace]):
                        raise LanguageDataError(
                            f"Empty field in row {row_num}: {row}"
                        )

                    # Check for duplicate namespaces
                    if namespace in lang_dict:
                        logger.warning(f"Duplicate namespace '{namespace}' found in row {row_num}")

                    lang_dict[namespace] = LanguageInfo(
                        language=language,
                        iso_639_1_code=iso_code,
                        namespace=namespace,
                        english_wiki_name=english_name,
                        localized_wiki_name=localized_name
                        )

                except KeyError as e:
                    raise LanguageDataError(f"Missing required field in row {row_num}: {e}")

    except csv.Error as e:
        raise LanguageDataError(f"CSV parsing error: {e}")

    if not lang_dict:
        raise LanguageDataError("No language data found in CSV file")

    logger.debug(f"Successfully loaded {len(lang_dict)} languages from {filepath}")
    return lang_dict


namespace_to_lang_info_dict: LanguageInfoDict = dict()
_dict_init_lock = Lock()


def get_language_info_for_namespace(namespace: str, language_file: str = DEFAULT_LANGUAGE_FILE_PATH) -> LanguageInfo:
    """
    Given a namespace, get the name of the corresponding language for it.
    Loads the language data from a CSV file, and uses global dict variables to cache it.
    """
    global namespace_to_lang_info_dict
    try:
        logger.info("Trying to load language for namespace `%s`", namespace)
        if namespace_to_lang_info_dict:
            return namespace_to_lang_info_dict[namespace]
        # if the dict isn't loaded yet, we'll load it below

    except KeyError as e:
        logger.error("Invalid namespace for language lookup: %s", namespace)
        raise e

    with _dict_init_lock:
        if not namespace_to_lang_info_dict:
            namespace_to_lang_info_dict = load_languages_from_csv(language_file)
    return namespace_to_lang_info_dict[namespace]


def get_language_for_namespace(namespace: str, language_file: str = DEFAULT_LANGUAGE_FILE_PATH) -> str:
    """
    Given a namespace, get the name of the corresponding language for it.
    Loads the language data from a CSV file, and uses global dict variables to cache it.
    """
    return get_language_info_for_namespace(namespace, language_file).language


def get_localized_wiki_name_for_namespace(namespace: str, language_file: str = DEFAULT_LANGUAGE_FILE_PATH) -> str:
    """
    Given a namespace, get the name of the corresponding language for it.
    Loads the language data from a CSV file, and uses global dict variables to cache it.
    """
    return get_language_info_for_namespace(namespace, language_file).localized_wiki_name
