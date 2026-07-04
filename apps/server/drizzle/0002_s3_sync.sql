CREATE SEQUENCE "public"."sync_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
DROP INDEX "idx_log_entries_user_updated";--> statement-breakpoint
ALTER TABLE "log_entries" DROP CONSTRAINT "log_entries_pkey";--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_user_id_id_pk" PRIMARY KEY("user_id","id");--> statement-breakpoint
ALTER TABLE "log_entries" ADD COLUMN "server_seq" bigint DEFAULT nextval('sync_seq') NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "server_seq" bigint DEFAULT nextval('sync_seq') NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_log_entries_user_seq" ON "log_entries" USING btree ("user_id","server_seq");--> statement-breakpoint
CREATE INDEX "idx_settings_user_seq" ON "settings" USING btree ("user_id","server_seq");