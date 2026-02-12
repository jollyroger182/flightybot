DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    flighty_id TEXT NOT NULL,
    slack_channel TEXT NOT NULL,
    slack_ts TEXT NOT NULL,
    creator_slack_id TEXT NOT NULL,
    slack_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
