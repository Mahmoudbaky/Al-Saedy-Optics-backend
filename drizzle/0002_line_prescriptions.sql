ALTER TABLE "carts" DROP CONSTRAINT "carts_prescription_id_prescriptions_id_fk";
--> statement-breakpoint
DROP INDEX "cart_items_line_uq";--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "prescription_id" uuid;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "requires_prescription" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "prescription_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "prescription" jsonb;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_prescription_idx" ON "order_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "order_items_appointment_idx" ON "order_items" USING btree ("appointment_id");--> statement-breakpoint
-- Backfill: move the order-level prescription snapshot onto the lines that need one,
-- so existing orders keep their Rx data after the column is dropped.
UPDATE "order_items" oi
SET "requires_prescription" = true
FROM "products" p
WHERE p."id" = oi."product_id" AND p."requires_prescription" = true;--> statement-breakpoint
UPDATE "order_items" oi
SET "prescription" = o."prescription",
    "prescription_id" = CASE WHEN EXISTS (SELECT 1 FROM "prescriptions" rx WHERE rx."id"::text = o."prescription"->>'id')
                             THEN (o."prescription"->>'id')::uuid ELSE NULL END
FROM "orders" o
WHERE o."id" = oi."order_id" AND o."prescription" IS NOT NULL AND oi."requires_prescription" = true;--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "prescription_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "prescription";--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_unique" UNIQUE("appointment_id");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_line_uq" UNIQUE NULLS NOT DISTINCT("cart_id","variant_id","addon_ids","variant_label","prescription_id","appointment_id");