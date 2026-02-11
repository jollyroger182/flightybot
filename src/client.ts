import { App } from '@slack/bolt'

const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, SLACK_APP_TOKEN } = process.env

export const app = new App({
  token: SLACK_BOT_TOKEN,
  appToken: SLACK_APP_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode: true,
})
