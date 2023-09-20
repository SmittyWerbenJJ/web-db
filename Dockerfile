ARG BRANCH_NAME

FROM node:lts-alpine AS front
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

COPY front/package.json front/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY front .
COPY common-helper.mjs ./src/shared/common-helper.mjs

RUN pnpm run build

COPY ./changelog.html ./dist/webdb


FROM node:lts-alpine
ENV NODE_ENV=production

RUN apk update
RUN apk add mysql-client bash mongodb-tools postgresql-client python3 make g++ openssh-keygen
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

COPY back/package.json back/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY back .
COPY common-helper.mjs ./src/shared/common-helper.mjs

RUN npm run obfuscate
RUN cp .env.production .env

COPY --from=front /usr/src/app/dist/webdb ./src/front

EXPOSE 22071
ENTRYPOINT NODE_ENV=production npm run start
