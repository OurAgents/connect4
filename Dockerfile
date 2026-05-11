FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

WORKDIR /app/frontend
RUN npm install
RUN npm run build

WORKDIR /app/backend
RUN pip3 install --no-cache-dir -r requirements.txt
RUN python3 -c "from database import engine, Base; from models import User; Base.metadata.create_all(bind=engine)"

WORKDIR /app
RUN echo '#!/bin/bash\ncd /app/backend\nuvicorn main:app --host 0.0.0.0 --port 8777' > start.sh
RUN chmod +x start.sh

EXPOSE 8777
CMD ["/app/start.sh"]
