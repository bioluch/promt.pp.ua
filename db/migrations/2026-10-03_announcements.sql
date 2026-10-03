-- ============================================================
-- Migration: release-announcement e-mail campaigns
-- Created automatically by api/server.js on start-up
-- (initAnnouncements); kept here for reference / manual setup.
-- ============================================================
CREATE TABLE IF NOT EXISTS announcement_campaigns (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject     varchar(200) NOT NULL,
    html        text NOT NULL,
    body_text   text NOT NULL,
    created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
    status      varchar(20) NOT NULL DEFAULT 'running',     -- running | done
    total       integer NOT NULL DEFAULT 0,
    sent        integer NOT NULL DEFAULT 0,
    failed      integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);
-- At most one campaign may be running at any time
CREATE UNIQUE INDEX IF NOT EXISTS uq_announcement_one_running
    ON announcement_campaigns ((true)) WHERE status = 'running';

CREATE TABLE IF NOT EXISTS announcement_deliveries (
    campaign_id uuid NOT NULL REFERENCES announcement_campaigns(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      varchar(10) NOT NULL,                       -- pending | sent | failed
    error       text,
    sent_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, user_id)
);
