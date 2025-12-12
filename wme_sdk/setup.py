# Source - https://stackoverflow.com/a
# Posted by jozo, modified by community. See post 'Timeline' for change history
# Retrieved 2025-12-12, License - CC BY-SA 4.0

from setuptools import setup, find_packages


setup(
    name="wme_sdk",
    version="1.0",
    packages=["wme_sdk", "wme_sdk.auth", "wme_sdk.api"],  # explicitly list packages
    package_dir={"wme_sdk": ".", "wme_sdk.auth": "auth", "wme_sdk.api": "api"},
)
