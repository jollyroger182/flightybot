ALTER TABLE subscriptions ADD COLUMN creator_slack_id TEXT;
UPDATE subscriptions SET creator_slack_id = '';
ALTER TABLE subscriptions ALTER COLUMN creator_slack_id SET NOT NULL;
