# Wikipedia Embeddings Generator

This project downloads and extracts Wikipedia article page titles and abstracts from [Wikimedia Enterprise](https://enterprise.wikimedia.com/),
then computes embeddings on them. 

## Project functions and structure

This project is managed by [uv](https://docs.astral.sh/uv/), the awesome Python package manager from Astral.

It implements a few functions:
* Fetch metadata from the Wikimedia Enterprise API about snapshots available for download
* Download snapshot chunks
* Unpack and extract article page titles and abstracts from the snapshot chunks
* Compute embeddings on the page titles and abstracts

All of the metadata and computed embeddings are stored in a Sqlite 3 database called `chunk_log.db`.

A slightly modified copy of the Wikimedia Enterprise Python SDK is in the `wme_sdk` directory. Their code has its own license, in the `LICENSE` file there. 

The main file is `command.py`; see below for use. 

## Getting started

To get started, create a virtual environment and activate it:

```bash
uv venv
source .venv/bin/activate
```

Fetch the project dependencies:

```bash
uv sync
```

The command engine can accept commands as arguments on the command line or interactively. To run interactively:

```bash
$ python -m command       
Welcome to wp-embeddings command interpreter!
Type 'help' for available commands or 'quit' to exit.

> help
Available commands:
  refresh - Refresh chunk data for a namespace
  download - Download chunks that haven't been downloaded yet
  unpack - Unpack and process downloaded chunks
  embed - Process remaining pages for embedding computation
  status - Show current system status
  help - Show help information

Use 'help <command>' for more information about a specific command.

> quit
Goodbye!
```

or on the command line:

```bash
$ python -m command status
INFO:database:Establishing SQLite connection
System Status:
Chunks: 417 total, 6 downloaded, 1 extracted
Pages: 71834 total, 19822 with embeddings
Chunk Completion: 0 complete, 417 incomplete
Page Completion: 52426 pending embeddings, 19822 complete, 71834 total pages.

Namespace breakdown:
  enwiki_namespace_0: 417 chunks, 6 downloaded
```


For required and optional parameters to a command, precede them with a double-dash:

```bash
python -m command refresh --namespace enwiki_namespace_0
```

## Command notes and tips

Most commands that can operate on more than one item accept a `--limit n` parameter to limit how many operations they perform. 
You can use this capability to manage the work done at any given time.  

The `download`, `unpack`, and `embed` commands will all try to avoid repeating work that's already been completed, so you can run 
them repeatedly with `--limit` to incrementally do the required work over an entire namespace. 

## Operational notes

* The Wikimedia Enterprise API client expects a `.env` file containing valid credentials in the following keys: `WME_USERNAME`, `WME_PASSWORD`.
* `PYTHONPATH` can also be set in the `.env` file to tell Python where to look for modules, if you aren't running in the project home directory.
* Downloaded archive files are stored in `./downloaded/{namespace}` and named like `{chunk_name}.tar.gz`.
* This code assumes that each archive contains exactly one chunk file in ndjson format. 
* Extracted archives are stored in `./extracted/{namespace}` and are deleted after unpacking and parsing completes (because they are about 2GB each!) 
* Both download and extract operations will overwrite files if the files exist already.
* Make sure you have enough disk space. For reference, the English Wikipedia namespace 0 archive (regular article pages) takes about 133G (measured in October 2025).

## Embeddings

Embeddings are computed with the 