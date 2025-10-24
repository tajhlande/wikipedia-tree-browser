from tqdm import tqdm
import logging

logger = logging.getLogger(__name__)


class ProgressTracker:
    """A simple progress tracker using tqdm for clean terminal output."""

    def __init__(self, description, total=None, unit="items"):
        self.description = description
        self.total = total
        self.unit = unit
        self.progress_bar = None
        self._is_started = False

    def start(self):
        """Start the progress bar"""
        if self._is_started:
            return

        # Handle the case where total is None to avoid tqdm issues
        kwargs = {
            "desc": self.description,
            "unit": self.unit,
            "ascii": True,
            "ncols": 120,
        }

        # Only add total if it's not None
        if self.total is not None:
            kwargs["total"] = self.total
        else:
            # When total is None, provide an iterable to avoid tqdm issues
            # We'll use a generator that yields None indefinitely
            kwargs["iterable"] = (None for _ in iter(int, 1))

        self.progress_bar = tqdm(**kwargs)
        self._is_started = True

    def set_total(self, total):
        """Set total for the progress bar"""
        self.total = total
        if self.progress_bar:
            self.progress_bar.total = total
            self.progress_bar.update(0)

    def increment(self, n=1):
        """Increment progress by n"""
        if self.progress_bar:
            self.progress_bar.update(n)

    def update(self, n=1):
        """Update progress"""
        if self.progress_bar:
            self.progress_bar.update(n)

    def set_progress(self, progress):
        """Set progress to explicit value"""
        if self.progress_bar:
            self.progress_bar.n = progress
            self.progress_bar.refresh()

    def close(self):
        """Close the progress bar"""
        if self.progress_bar:
            self.progress_bar.close()
            self.progress_bar = None
        self._is_started = False

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
