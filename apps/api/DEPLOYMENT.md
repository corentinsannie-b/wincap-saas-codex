# Deployment Guide

This guide covers deployment of the Wincap API to production environments.

## Deployment Options

### Option 1: Docker (Recommended)

```dockerfile
# Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libcairo2 libcairo2-dev libpango-1.0-0 libpango-cairo-1.0-0 \
    libgdk-pixbuf2.0-0 python3-cffi \
    && rm -rf /var/lib/apt/lists/*

# Copy project
COPY . /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Create non-root user
RUN useradd -m -u 1000 wincap && chown -R wincap:wincap /app
USER wincap

# Expose port
EXPOSE 8000

# Run API
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t wincap-api .
docker run -p 8000:8000 \
  -v /data/uploads:/tmp/wincap \
  -e LOG_LEVEL=INFO \
  wincap-api
```

### Option 2: Systemd Service (Linux)

```ini
# /etc/systemd/system/wincap-api.service
[Unit]
Description=Wincap API
After=network.target

[Service]
Type=simple
User=wincap
WorkingDirectory=/opt/wincap/apps/api
Environment="PATH=/opt/wincap/venv/bin"
EnvironmentFile=/etc/wincap/api.env
ExecStart=/opt/wincap/venv/bin/python3 api.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable wincap-api
sudo systemctl start wincap-api
sudo systemctl status wincap-api
```

### Option 3: Gunicorn + Nginx (Production)

```bash
# Install Gunicorn
pip install gunicorn

# Create Gunicorn config
cat > /etc/wincap/gunicorn.conf.py << 'EOF'
bind = "127.0.0.1:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
max_requests = 1000
max_requests_jitter = 100
timeout = 30
accesslog = "/var/log/wincap/access.log"
errorlog = "/var/log/wincap/error.log"
loglevel = "info"
EOF

# Start Gunicorn
gunicorn -c /etc/wincap/gunicorn.conf.py api:app
```

Nginx reverse proxy:
```nginx
# /etc/nginx/sites-available/wincap
upstream wincap_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.wincap.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://wincap_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /static/ {
        alias /opt/wincap/static/;
    }

    # SSL configuration
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.wincap.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.wincap.com/privkey.pem;
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/wincap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Configuration

Create `.env` file or set environment variables:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# CORS Configuration
CORS_ORIGINS=https://wincap.com,https://app.wincap.com
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization

# File Upload
MAX_FILE_SIZE=52428800  # 50 MB
ALLOWED_EXTENSIONS=.txt
UPLOAD_TEMP_DIR=/data/wincap/uploads

# Session Management
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_HOURS=6

# Processing
VAT_RATE_DEFAULT=1.20
MAX_PARALLEL_FILES=4

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/wincap/api.log

# Environment
ENVIRONMENT=production
DEBUG=false
```

## Database Setup (Optional)

For production, consider using a database instead of in-memory sessions:

```python
# In config/settings.py
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///wincap.db")

# In api.py
from sqlalchemy import create_engine
engine = create_engine(settings.DATABASE_URL)
```

## Security Configuration

### 1. HTTPS/SSL

```bash
# Generate self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Run API with SSL
python3 api.py --ssl-keyfile key.pem --ssl-certfile cert.pem
```

### 2. Authentication

Implement JWT authentication:

```python
from fastapi.security import HTTPBearer, HTTPAuthCredential
from jose import jwt

security = HTTPBearer()

@app.get("/api/summary/{session_id}")
async def get_summary(session_id: str, credentials: HTTPAuthCredential = Depends(security)):
    token = credentials.credentials
    # Verify token
    payload = jwt.decode(token, "secret_key", algorithms=["HS256"])
    return {...}
```

### 3. Rate Limiting

```bash
pip install slowapi

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@limiter.limit("100/minute")
def upload_file(...):
    # Implementation
```

### 4. Input Validation

- All file uploads are validated
- Max file size: 50 MB
- Allowed extensions: `.txt`
- Forbidden characters in filenames

### 5. Error Handling

Never expose internal errors:

```python
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

## Monitoring & Logging

### Structured Logging

```python
import json
import logging

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        }
        return json.dumps(log_data)
```

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }
```

Monitor with:
```bash
# Check health every 30 seconds
watch -n 30 curl http://localhost:8000/health
```

### Application Performance Monitoring (APM)

```bash
pip install prometheus-client

from prometheus_client import Counter, Histogram

request_count = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')

@app.middleware("http")
async def add_metrics(request, call_next):
    request_count.inc()
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    request_duration.observe(duration)
    return response
```

## Backup & Recovery

### Backup Strategy

```bash
# Backup uploaded files daily
0 2 * * * tar -czf /backups/wincap_$(date +%Y%m%d).tar.gz /data/wincap/uploads

# Backup logs weekly
0 3 * * 0 tar -czf /backups/logs_$(date +%Y%m%d).tar.gz /var/log/wincap

# Upload to S3
aws s3 sync /backups s3://wincap-backups/
```

### Disaster Recovery

```bash
# Restore from backup
tar -xzf /backups/wincap_20240101.tar.gz -C /

# Verify data integrity
find /data/wincap -type f -exec md5sum {} \; | md5sum -c checksums.txt
```

## Scaling

### Horizontal Scaling (Multiple Instances)

```yaml
# Docker Compose
version: '3.8'
services:
  api1:
    image: wincap-api:latest
    ports:
      - "8001:8000"
    environment:
      - API_HOST=0.0.0.0
      - UPLOAD_TEMP_DIR=/data/uploads

  api2:
    image: wincap-api:latest
    ports:
      - "8002:8000"
    environment:
      - API_HOST=0.0.0.0
      - UPLOAD_TEMP_DIR=/data/uploads

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api1
      - api2
```

### Load Balancing

Use round-robin load balancing:

```nginx
upstream wincap_backend {
    server api1.example.com:8000;
    server api2.example.com:8000;
    server api3.example.com:8000;

    # Health checks
    check interval=3000 rise=2 fall=5 timeout=1000 type=http;
    check_http_send "GET /health HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx;
}

server {
    listen 80;
    server_name api.wincap.com;

    location / {
        proxy_pass http://wincap_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Maintenance

### Database Cleanup

```bash
# Remove old session data
DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '24 hours';

# Vacuum database
VACUUM;
```

### Log Rotation

```ini
# /etc/logrotate.d/wincap
/var/log/wincap/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 wincap wincap
    sharedscripts
}
```

### Performance Tuning

```bash
# Monitor resource usage
top -p $(pgrep -f "python3 api.py")
iostat -x 1
netstat -an | grep ESTABLISHED | wc -l

# Optimize Python
export PYTHONHASHSEED=0
export PYTHONUNBUFFERED=1
export PYTHONDONTWRITEBYTECODE=1
```

## Troubleshooting

### High Memory Usage

```bash
# Check for memory leaks
pip install memory-profiler
python3 -m memory_profiler api.py

# Monitor with psutil
pip install psutil
python3 -c "
import psutil
p = psutil.Process()
while True:
    print(f'Memory: {p.memory_info().rss / 1024 / 1024:.1f} MB')
"
```

### Slow File Processing

```bash
# Profile execution
python3 -m cProfile -s cumtime main.py generate --fec-file large_file.txt

# Increase workers/parallelism
MAX_PARALLEL_FILES=8 python3 api.py
```

### Connection Issues

```bash
# Check port availability
lsof -i :8000

# Check CORS headers
curl -H "Origin: http://localhost:3000" http://localhost:8000/api/summary/test -v

# Check firewall
sudo ufw allow 8000/tcp
sudo ufw status
```

## Support & Maintenance

- Monitor logs: `/var/log/wincap/api.log`
- Check health: `curl http://localhost:8000/health`
- View metrics: `curl http://localhost:8000/metrics`
- Report issues: https://github.com/corentinsannie-b/wincap-dashboard/issues
