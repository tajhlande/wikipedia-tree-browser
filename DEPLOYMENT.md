# Deployment instructions for Toolforge

In Toolforge, this tool is named `wikipedia-tree-browser`.

Toolhub link: [Wikipedia Tree Browser](https://toolhub.wikimedia.org/tools/toolforge-wikipedia-tree-browser)

## Commands to deploy an update

**Note:** Before deploying, ensure you have run `npm run build` and committed the `dist` changes to git
AND pushed them to gitlab before doing a deployment.

First, ssh into toolforge:

```bash
ssh login.toolforge.org
```

Then become the tool:

```bash
become wikipedia-tree-browser
```

As the tool, build and restart the web service:

```bash
toolforge webservice buildservice stop
toolforge build start https://gitlab.wikimedia.org/toolforge-repos/wikipedia-tree-browser.git
toolforge webservice buildservice start --mount=all --health-check-path /health
```

## Updating the SQLite data files

These files live on Toolforge in the shared data directory: `/data/project/wikipedia-tree-browser/data`

To add or update the `*_slim.db` database files:

1. scp then to `login.toolforge.org`
2. Move or copy them to `/data/project/wikipedia-tree-browser/data`
3. Restart the webservice

## Configuration notes:

There is one environment variable set via toolforge (after becoming the `wikipedia-tree-browser` tool):

```bash
toolforge envvars create DB_FILE_PATH /data/project/wikipedia-tree-browser/data
```

This tells the API backend where to find the database files.
