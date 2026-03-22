FROM ghcr.io/gitroomhq/postiz-app:latest

USER root

# Install dependencies, PM2, and Temporal CLI
RUN apt-get update && apt-get install -y curl
RUN curl -sSf https://temporal.download/cli.sh | sh
RUN mv /root/.temporalio/bin/temporal /usr/local/bin/temporal
RUN npm install -g pm2

WORKDIR /app

# Copy orchestration files
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY proxy.js /app/proxy.js

# --- CRITICAL FIX: Hugging Face runs as User 1000 ---
# This ensures PM2 and Temporal write their configs to a writable folder
ENV HOME=/tmp
ENV PM2_HOME=/tmp/.pm2

# Optimization and Pathing
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV UPLOAD_DIRECTORY=""
ENV NEXT_PUBLIC_UPLOAD_DIRECTORY=""

# Hugging Face exposes 7860
EXPOSE 7860

CMD ["/entrypoint.sh"]
