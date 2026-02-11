web: echo "Running npm build" && npm run build && echo "going to web/backend" && cd web/backend && echo "Running uvicorn" && uvicorn app.main:app --host 0.0.0.0 --port $PORT
EOF
