FROM borkdude/clj-kondo:2020.04.06-SNAPSHOT AS binary

FROM node:10-slim

COPY lib /action/lib
COPY --from=binary /usr/local/bin/clj-kondo /usr/local/bin/clj-kondo
ENTRYPOINT ["/action/lib/entrypoint.sh"]
