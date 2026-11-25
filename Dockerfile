FROM node:26-bookworm-slim
WORKDIR /app
COPY --chown=node:node *.html *.js *.css *.png *.webp *.jpg *.ico robots.txt sitemap.xml package.json ./
COPY --chown=node:node documents ./documents
COPY --chown=node:node server ./server
RUN mkdir -p /app/var && chown node:node /app/var
USER node
ENV NODE_ENV=production PORT=8080 ZIOK_BIND_HOST=0.0.0.0 ZIOK_STATE_FILE=/app/var/content.json
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/app.cjs"]
